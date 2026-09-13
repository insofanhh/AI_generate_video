<a id="top"></a>

<div align="center">

<img src="./assets/logo.svg" alt="AI Coding" width="96" />

<h1>AI&nbsp;Coding&nbsp;·&nbsp;Template&nbsp;Video</h1>

<p><b>A Vietnamese article in. A 9:16 short out.</b><br/>
One command · zero editing · deterministic renders.</p>

<p>
<img alt="Node" src="https://img.shields.io/badge/Node-%E2%89%A522-339933?style=flat-square&logo=node.js&logoColor=white" />
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white" />
<img alt="HyperFrames" src="https://img.shields.io/badge/HyperFrames-0.6.94-ec4899?style=flat-square" />
<img alt="OmniVoice" src="https://img.shields.io/badge/TTS-OmniVoice-f59e0b?style=flat-square" />
<img alt="Format" src="https://img.shields.io/badge/9%3A16-1080%C3%971920-0ea5e9?style=flat-square" />
<img alt="License" src="https://img.shields.io/badge/License-MIT-10b981?style=flat-square" />
</p>

<p><b>🌐 English</b> · <a href="README.vi.md">Tiếng Việt</a></p>

<sub>
<a href="#-quick-start"><b>Quick Start</b></a> ·
<a href="#-how-it-works"><b>How It Works</b></a> ·
<a href="#-usage"><b>Usage</b></a> ·
<a href="#-templates"><b>Templates</b></a>
</sub>

</div>


## 📰 News templates (default)

### Newsroom Studio

Run `npm install` and `npm run dev`, then open **http://127.0.0.1:4173**.
The local editor supports article URL extraction (with manual text fallback),
AI script generation, editable scenes, crawled/uploaded images, OmniVoice
Design/Clone controls, voice preview reuse, render progress, and MP4/MP3/TXT/JSON downloads.
Drafts persist in the browser; assets, jobs, and local AI configuration live in
the ignored `output/studio-data` folder. Each render gets a new output folder.

Codex CLI authentication is used by default (`codex login`; optionally set
`CODEX_BIN`). **Cấu hình AI** switches to an OpenAI-compatible Chat Completions
endpoint with editable base URL, model and API key (JSON object output required).
Keys stay on the local server. Point `OMNIVOICE_ENDPOINT` to your Gradio service.
FFmpeg and ffprobe are bundled via npm; `FFMPEG_DIR` overrides their location.
The first HyperFrames render may download Chromium. The gallery command
`npm run news:preview` shares port 4173, so stop it before starting Studio.
See [Vietnamese instructions](README.vi.md) for the complete workflow.

The default `frame-news` composition uses prominent source images, a source strip,
publication date, headline, summary and optional scene caption. Choose `slide`
(default), `light`, `dark` or `modern`; native 9:16, 16:9 and 1:1 layouts are included.
Use the same theme for hook, body and outro. Legacy scripts remain supported.

```bash
npm run news:preview
```

Render an 8-second visual sample without TTS: `npm run news:render`.
Output: `output/news-preview.mp4` (silent).

**English videos:** set `voice.language` to `"English"` and write the title,
channel, scene text and image credits in English. The news template switches its
built-in labels to English automatically. OmniVoice designs an English reference
at `voice/narrator-reference-en.wav` and reuses it for all scenes. Omit the language
field for the existing Vietnamese default. Use a new output directory when
changing the language so previously rendered visual clips are not reused.

**One narrator throughout:** with OmniVoice Gradio, the pipeline designs one
synthetic reference and clones it for every scene. The reference is saved as
`voice/narrator-reference.wav`. To reuse a chosen reference, set
`voice.referenceAudio` (relative to script.json) and `voice.referenceText`
(the exact speech in that reference). Audio caches are checked against the
reference and narration; old randomly voiced scenes are regenerated. Visual
clips still use filename caching, so use a new output folder after visual edits.


Open [the interactive preview](http://127.0.0.1:4173) to switch theme and aspect.
Copy the entire `examples/news` folder to `output/news-demo` (keep the same folder
depth for relative image paths), then run:

```bash
npm run pipeline -- output/news-demo/script.json
```

Rendering requires OmniVoice, FFmpeg and Chromium. The example is explicitly mock
content. Images are embedded from `inputs.images` or `metadata.source.image`.
`metadata.publishedAt` supplies the actual publication date; unknown dates stay empty.
`caption` is a static scene note; use `script.txt` with CapCut for voice-aligned subtitles.
See [the catalog](templates/CATALOG.md) for all input slots.


---

<div align="center">
<img src="./assets/pipeline.svg" alt="url / .txt → Claude Code (/create-template-video) → pipeline (OmniVoice · SFX · HyperFrames · FFmpeg) → video.mp4 + voice.mp3 + script.txt" width="860" />
</div>

> **The split that makes it reliable:** AI handles _content_ (the script + template choices),
> deterministic code handles _production_ (the pixels). The same `script.json` always renders the
> same video — no surprises, no manual editing.

You supply the **text**. The templates own all the design, layout, and motion. The pipeline does
TTS, sound design, rendering, and the final mux — and hands you three files ready for
CapCut / TikTok / Shorts / Reels:

| File         | What it's for                              |
| ------------ | ------------------------------------------ |
| `video.mp4`  | Final 9:16 video with voice + SFX baked in |
| `voice.mp3`  | Narration track — drop into CapCut         |
| `script.txt` | Plain text — CapCut auto-caption           |

---

<div align="center">

### 📚 Muốn làm chủ Claude Code? Học bài bản cùng AI Coding

<a href="https://www.udemy.com/course/claude-code-in-action-practical-guide-from-beginner-to-pro/?referralCode=C62ACDC291F191DF9E55">
<img src="https://img-c.udemycdn.com/course/480x270/7112153_093e_13.jpg" alt="Vibe Coding Thực Chiến với Claude Code: Từ Zero đến Hero" width="480" />
</a>

**Vibe Coding Thực Chiến với Claude Code: Từ Zero đến Hero**
<br/><sub><b>Senior AI Engineer</b> @ AI Coding</sub>

<p><sub>
Setup &nbsp;·&nbsp; Permission Modes &nbsp;·&nbsp; Memory &nbsp;·&nbsp; Hooks &nbsp;·&nbsp; Skills &nbsp;·&nbsp; MCP Servers &nbsp;·&nbsp; Subagents &nbsp;·&nbsp; GitHub<br/>
Từ <b>zero</b> đến <b>hero</b> — đúng cách build agent &amp; tự động hoá như repo này.
</sub></p>

[![Đăng ký trên Udemy](https://img.shields.io/badge/▶_Đăng_ký_ngay_trên_Udemy-A435F0?style=for-the-badge&logo=udemy&logoColor=white)](https://www.udemy.com/course/claude-code-in-action-practical-guide-from-beginner-to-pro/?referralCode=C62ACDC291F191DF9E55)

</div>

---

<div align="center">

### 📚 Làm chủ Claude Cowork — Tự động hoá công việc hàng ngày

<a href="https://www.udemy.com/course/lam-chu-claude-cowork-tu-ong-hoa-cac-cong-viec-hang-ngay/?referralCode=8F16E4A8C45809E532D3">
<img src="assets/cowork.jpg" alt="Làm chủ Claude Cowork - Tự động hoá các công việc hàng ngày" width="480" />
</a>

**Làm chủ Claude Cowork - Tự động hoá các công việc hàng ngày**
<br/><sub><b>Senior AI Engineer</b> @ AI Coding</sub>

<p><sub>
Setup &nbsp;·&nbsp; Tổng hợp email &nbsp;·&nbsp; Lên lịch chạy tự động &nbsp;·&nbsp; Xử lý file &nbsp;·&nbsp; Tạo report &nbsp;·&nbsp; Tạo interactive dashboard &nbsp;·&nbsp; Claude in chrome &nbsp;·&nbsp;
</sub></p>

[![Đăng ký trên Udemy](https://img.shields.io/badge/▶_Đăng_ký_ngay_trên_Udemy-A435F0?style=for-the-badge&logo=udemy&logoColor=white)](https://www.udemy.com/course/lam-chu-claude-cowork-tu-ong-hoa-cac-cong-viec-hang-ngay/?referralCode=8F16E4A8C45809E532D3)

</div>

---

## 🚀 Quick Start

> 📺 **Detailed guide:** [Watch the video walkthrough on YouTube](https://www.youtube.com/watch?v=V08-8KLmbnA)

```bash
git clone https://github.com/insofanhh/AI_generate_video.git
cd AI_generate_video
npm install
# start your local OmniVoice server, then generate video
```

<table>
<tr>
<td valign="top" width="50%">

**With Claude Code** — _recommended_

```text
/create-template-video https://aicodingvn.vercel.app/some-article
```

Claude fetches the article, writes `script.json`, and runs the pipeline for you.

</td>
<td valign="top" width="50%">

**Manual** — _bring your own `script.json`_

```bash
npm run pipeline -- output/my-video/script.json
```

Full control over every scene and template.

</td>
</tr>
</table>

A few minutes later → `output/<slug>/video.mp4` (1080×1920).

**Note**: The `.agent` directory has been added, so all these instructions work not only with Claude Code but can also work with other Coding Assistants, since everything here is a skill.

---

## 🎥 Live demo

### 👉 [**▶️ Watch on YouTube Shorts**](https://youtube.com/shorts/LUAgRhPBONg) 👈

[![Watch Demo](https://img.youtube.com/vi/LUAgRhPBONg/maxresdefault.jpg)](https://youtube.com/shorts/LUAgRhPBONg)

---

## 🧠 How It Works

```mermaid
flowchart LR
    A["📰 URL / .txt"] -->|/create-template-video| B[Claude Code]
    B -->|fetch + write text| C["script.json<br/>renderer: hyperframes"]
    C -->|Zod validate| D[Template Pipeline]
    D -->|TTS per scene| E[OmniVoice]
    E -->|concat + SFX mix| F[voice.mp3]
    D -->|render each template| G["HyperFrames<br/>Chromium"]
    G -->|fit clip to narration| H["clips/scene-*.mp4"]
    F --> I[mux audio]
    H --> I
    I -->|🎬| J["video.mp4<br/>1080×1920"]

    style A fill:#0f172a,color:#fff,stroke:#334155
    style B fill:#6366f1,color:#fff,stroke:#6366f1
    style E fill:#f59e0b,color:#fff,stroke:#f59e0b
    style G fill:#ec4899,color:#fff,stroke:#ec4899
    style J fill:#10b981,color:#fff,stroke:#10b981
```

Eight deterministic steps in [`src/render/template-pipeline.ts`](src/render/template-pipeline.ts):

| #   | Step             | Output                                                        |
| --- | ---------------- | ------------------------------------------------------------- |
| 1   | **Validate**     | `script.json` checked against the Zod schema                  |
| 2   | **Caption text** | `script.txt` — all `voiceText` joined (CapCut auto-caption)   |
| 3   | **TTS / scene**  | `voice/scene-<id>.mp3` via OmniVoice _(idempotent)_           |
| 4   | **Concat voice** | `voice-raw.mp3` with 0.3s gaps + per-scene start times        |
| 5   | **SFX mix**      | `voice.mp3` — sound effects layered onto the narration        |
| 6   | **Render clips** | `clips/scene-<id>-fit.mp4` — template → MP4, fit to narration |
| 7   | **Concat + mux** | `video-silent.mp4` → `video.mp4` (voice muxed in)             |
| 8   | **Done**         | prints result paths + total duration                          |

---

## ⚡ Setup

<details open>
<summary><b>Prerequisites</b></summary>

<br/>

| Item                  | Need       | Notes                                                               |
| --------------------- | ---------- | ------------------------------------------------------------------- |
| **Node.js**           | ≥ 22       | `node --version`                                                    |
| **FFmpeg + ffprobe**  | any modern | must be in PATH (`ffmpeg -version`)                                 |
| **Chrome / Chromium** | any        | used by HyperFrames to render each template                         |
| **OmniVoice server**  | running    | local TTS at `OMNIVOICE_ENDPOINT` (default `http://127.0.0.1:8123`) |
| **Claude Code CLI**   | optional   | only for the `/create-template-video` skill                         |

**Install FFmpeg:**

- **Windows** — `winget install Gyan.FFmpeg`
- **macOS** — `brew install ffmpeg`
- **Linux** — `sudo apt install ffmpeg`

</details>

<details open>
<summary><b>Configuration</b> — <code>.env.local</code></summary>

<br/>

OmniVoice is the only TTS provider, and it's local — **no API keys.**

```env
TTS_PROVIDER=omnivoice
OMNIVOICE_ENDPOINT=http://127.0.0.1:8123
```

The server must accept `POST /tts` with `{ text }` and return `audio/mpeg` bytes.

</details>

---

## 🎬 Usage

**Inside Claude Code** _(recommended)_ — pass a URL or a local `.txt`:

```text
/create-template-video https://aicodingvn.vercel.app/iphone-17-200mp
/create-template-video news/my-article.txt
```

The skill reads the content, writes `script.json`, and runs the pipeline. Authoring rules
(template mapping + Vietnamese TTS number handling) live in the
[skill spec](.claude/skills/create-template-video/SKILL.md).

**Or run the pipeline directly** on an existing `script.json`:

```bash
npm run pipeline -- output/<slug>/script.json
```

<details>
<summary><b>📄 <code>script.json</code> shape</b> (template mode)</summary>

<br/>

```json
{
  "version": "1.0",
  "renderer": "hyperframes",
  "aspect": "9:16",
  "metadata": {
    "title": "Không gian xanh và nhịp sống đô thị",
    "channel": "BẢN TIN",
    "source": { "url": "", "domain": "local", "image": null }
  },
  "voice": { "provider": "omnivoice", "speed": 1 },
  "scenes": [
    {
      "id": "hook", "type": "hook", "templateId": "frame-news",
      "voiceText": "Đây là bản tin minh họa giao diện. Chủ đề hôm nay là không gian xanh và nhịp sống đô thị.",
      "inputs": {
        "theme": "slide", "category": "Đô thị",
        "headline": "Diện mạo mới từ những không gian xanh giữa lòng đô thị",
        "summary": "Kết nối không gian công cộng với nhịp sống hàng ngày của người dân.",
        "section": "Nội dung minh họa",
        "images": [{ "src": "../../templates/frame-news/assets/city-demo.svg", "alt": "Đồ họa công viên và đường chân trời đô thị", "credit": "Đồ họa minh họa · Không phải ảnh sự kiện" }]
      }
    },
    {
      "id": "body-1", "type": "body", "templateId": "frame-news",
      "voiceText": "Khung ảnh lớn giúp người xem theo dõi câu chuyện. Tiêu đề, nguồn ảnh và nội dung tóm tắt được trình bày rõ ràng trên cùng một khuôn hình.",
      "inputs": {
        "theme": "slide", "category": "Đô thị", "headline": "Thêm không gian kết nối cộng đồng",
        "summary": "Thay nội dung minh họa bằng thông tin và ảnh đã kiểm chứng từ bài viết nguồn.",
        "caption": "Chú thích ngắn theo cảnh; không phải phụ đề đồng bộ giọng đọc.",
        "section": "Nội dung minh họa",
        "images": [{ "src": "../../templates/frame-news/assets/city-demo.svg", "credit": "Đồ họa minh họa · Không phải ảnh sự kiện" }]
      }
    },
    {
      "id": "outro", "type": "outro", "templateId": "frame-news",
      "voiceText": "Cảm ơn bạn đã theo dõi. Hẹn gặp lại trong bản tin tiếp theo.",
      "inputs": {
        "theme": "slide", "category": "Điểm tin", "headline": "Hẹn gặp lại trong bản tin tiếp theo",
        "summary": "Theo dõi để cập nhật những câu chuyện mới mỗi ngày.",
        "section": "Kết thúc bản tin",
        "images": [{ "src": "../../templates/frame-news/assets/city-demo.svg", "credit": "Đồ họa minh họa · Không phải ảnh sự kiện" }]
      }
    }
  ]
}
```

Schema rules: **3–12 scenes** · `scenes[0].type === "hook"` · last scene `type === "outro"` ·
every `templateId` must exist under `templates/`.

</details>

<details>
<summary><b>📁 Output structure</b></summary>

<br/>

```
output/<slug>-<timestamp>/
├── script.json          # input (skill-generated or hand-written)
├── script.txt           # all voiceText joined — CapCut auto-caption
├── voice/
│   ├── scene-hook.mp3    # TTS per scene (idempotent)
│   └── scene-*.mp3
├── voice-raw.mp3        # concatenated voices, no SFX (intermediate)
├── voice.mp3           # final audio with SFX mixed in
├── clips/
│   ├── scene-hook.mp4     # rendered template clip (idempotent)
│   └── scene-hook-fit.mp4 # fitted to the scene's narration length
├── video-silent.mp4    # concatenated clips, no audio (intermediate)
└── video.mp4          # 🎉 final — 1080×1920 + voice + SFX
```

> **Idempotent.** Delete `voice/scene-<id>.mp3` to force re-TTS, or `clips/scene-<id>.mp4` to
> re-render just that scene, then re-run the pipeline.

</details>

---

## 🎨 Templates

Every visual is a self-contained **HyperFrames** project under `templates/` — `index.html` (16:9)
and `compositions/portrait.html` (9:16). You fill the text `inputs`; the template owns the design.
Full slot reference: [`templates/CATALOG.md`](templates/CATALOG.md).

| Template                    | Role  | Best for                                                  |
| --------------------------- | :---: | --------------------------------------------------------- |
| `frame-news` | all | **Default** — news images, 4 themes, 3 aspects |
| `frame-liquid-bg-hero`      | hook  | Opening hook — aurora hero with headline + CTA pill       |
| `frame-vignelli`            | body  | A single striking stat — dark charcoal + red accent       |
| `frame-pentagram-stat`      | body  | A hero number / benchmark — dark neon + bar chart         |
| `frame-bold-poster`         | body  | A punchy multi-line statement + giant figure              |
| `frame-build-minimal`       | body  | One bold word revealed letter-by-letter — dark/amber      |
| `frame-creative-voltage`    | body  | A creative slogan — electric-blue split + handwriting     |
| `frame-glitch-title`        | body  | Breaking / tech news — cyberpunk RGB-split glitch         |
| `frame-aicoding-list`       | body  | A **list** of 2–5 items (icon + level tag)                |
| `frame-aicoding-comparison` | body  | A **head-to-head** comparison of two things               |
| `frame-logo-outro`          | outro | Optional brand end-card — logo glow + name + tagline + URL |
| `frame-statement-outro`     | outro | Alternative outro — red statement card on paper           |

> **Add your own:** drop `templates/<id>/` with `index.html`, `compositions/portrait.html`,
> `hyperframes.json`, `meta.json` (+ `NOTICE.md` if vendored), then add a row to `CATALOG.md`.
> Use a Vietnamese-capable font stack.

---

## 🔊 Sound Effects

SFX live in `assets/sfx/<category>/<name>.mp3`. Per scene, the picker
([`src/assets/sfx-selector.ts`](src/assets/sfx-selector.ts)) resolves in three tiers:

```
1. scene.sfx override   → exact file, or { "name": "none" } to mute
2. semantic match        → voiceText keywords (cảnh báo→alert, kỷ lục→success, ra mắt→reveal …)
3. scene-type default    → hook→hook · body→callout · outro→outro
```

Within a category the file is chosen **deterministically** by hashing the scene id — same script
gives the same SFX, different scenes get different files. The library is large and **not
committed**:

```bash
npm run sfx:download   # fetch the SFX library
npm run sfx:filter     # prune / filter it
```

No `assets/sfx/`? The pipeline just renders without SFX.

---

## 🛠️ Built With

| Layer             | Technology                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------- |
| **Runtime**       | Node ≥22 · TypeScript 6 · ESM · [tsx](https://github.com/privatenumber/tsx)               |
| **Render**        | [HyperFrames](https://www.npmjs.com/package/hyperframes) `0.6.94` (HTML→MP4 via Chromium) |
| **TTS**           | OmniVoice (local)                                                                         |
| **Schema**        | [Zod](https://zod.dev) ^4                                                                 |
| **HTTP**          | axios + [nock](https://github.com/nock/nock)                                              |
| **Concurrency**   | [p-limit](https://github.com/sindresorhus/p-limit)                                        |
| **A/V**           | FFmpeg + ffprobe                                                                          |
| **Tests**         | [Vitest](https://vitest.dev) ^4                                                           |
| **Orchestration** | [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) skill                 |

---

## 🙏 Acknowledgements

- [HyperFrames](https://www.npmjs.com/package/hyperframes) — the HTML-to-video engine behind the templates
- [OmniVoice](https://github.com/k2-fsa/OmniVoice) — local Vietnamese text-to-speech
- [html-video](https://github.com/nexu-io/html-video) — HTML-to-video approach this project builds on
- [Auto-Create-Video](https://github.com/hoquanghai/Auto-Create-Video) — the original project this is based on

---

## 💖 Support this project

If this project saved you time, please consider:

- ⭐ **Star this repo** — it really helps with discoverability
- 🎓 **[Check out AI Coding's courses on Udemy](https://www.udemy.com/user/tran-van-huy-7/)**
- 📱 **Follow AI Coding** on [Facebook](https://www.facebook.com/aicoding2010) · [TikTok](https://www.tiktok.com/@aicoding2010) · [YouTube](https://www.youtube.com/@aicoding2010)
- 💬 Tell a friend who creates content
- 🐛 Report bugs or request features

---

## ⭐ Star History

<a href="https://www.star-history.com/?type=date&repos=insofanhh%2FAI_generate_video">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=insofanhh/AI_generate_video&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=insofanhh/AI_generate_video&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=insofanhh/AI_generate_video&type=date&legend=top-left" />
 </picture>
</a>

---

<div align="center">

<br/>

**[⬆ Back to top](#top)**

<sub>Made with ❤️ by <b>AI Coding</b> · <a href="https://aicodingvn.vercel.app/">aicodingvn.vercel.app</a></sub>

</div>
