import { describe, it, expect, afterEach } from "vitest";
import nock from "nock";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OmniVoiceClient } from "./omnivoice-client.js";

const endpoint = "http://omnivoice.test";
const dirs: string[] = [];
afterEach(async () => { nock.cleanAll(); await Promise.all(dirs.splice(0).map(p => rm(p, { recursive: true, force: true }))); });
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "narrator-test-")); dirs.push(dir);
  const audioPath = join(dir, "reference.wav");
  await writeFile(audioPath, "synthetic reference audio");
  return { dir, audioPath, text: "Đây là giọng đọc mẫu.", speed: 1, explicitReference: true };
}
function prepareMocks() {
  nock(endpoint).get("/gradio_api/info").reply(200, { named_endpoints: { "/_clone_fn": {} } });
  nock(endpoint).post("/gradio_api/upload").reply(200, ["/tmp/fixed-reference.wav"]);
}
function responseMock(api: string, id: string) {
  nock(endpoint).get(`/gradio_api/call/${api}/${id}`).reply(200,
    `event: complete\ndata: [{"url":"${endpoint}/audio/${id}"},"Success"]\n\n`);
  nock(endpoint).get(`/audio/${id}`).reply(200, Buffer.from(`audio-${id}`));
}

describe("OmniVoice shared narrator", () => {
  it("uses the same uploaded voice and transcript for every scene, with no voice-design requests", async () => {
    const options = await fixture(); prepareMocks();
    const client = new OmniVoiceClient({ endpoint });
    const fingerprint = await client.prepareVoice(options);
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    for (const [index, text] of ["Cảnh mở đầu.", "Cảnh tiếp theo."].entries()) {
      const id = String(index);
      nock(endpoint).post("/gradio_api/call/_clone_fn", body => {
        expect(body.data[0]).toBe(text);
        expect(body.data[1]).toBe("Vietnamese");
        expect(body.data[2].path).toBe("/tmp/fixed-reference.wav");
        expect(body.data[3]).toBe(options.text);
        expect(body.data[8]).toBe(1);
        return true;
      }).reply(200, { event_id: id });
      responseMock("_clone_fn", id);
      const out = join(options.dir, `${id}.mp3`);
      await client.generate(text, out);
      expect(await readFile(out, "utf8")).toBe(`audio-${id}`);
    }
    expect(nock.isDone()).toBe(true);
  });

  it("creates one saved synthetic reference when none is supplied", async () => {
    const options = await fixture(); options.audioPath = join(options.dir, "new-reference.wav");
    options.explicitReference = false;
    prepareMocks();
    nock(endpoint).post("/gradio_api/call/_design_fn").reply(200, { event_id: "reference" });
    responseMock("_design_fn", "reference");
    const client = new OmniVoiceClient({ endpoint });
    await client.prepareVoice(options);
    expect(await readFile(options.audioPath, "utf8")).toBe("audio-reference");
    expect(nock.isDone()).toBe(true);
  });

  it("fails instead of silently switching speaker if cloning fails", async () => {
    const options = await fixture(); prepareMocks();
    const client = new OmniVoiceClient({ endpoint }); await client.prepareVoice(options);
    nock(endpoint).post("/gradio_api/call/_clone_fn").reply(400, { error: "Invalid reference" });
    await expect(client.generate("Lời đọc.", join(options.dir, "failed.mp3"))).rejects.toThrow("status 400");
    expect(nock.isDone()).toBe(true);
  });
});
