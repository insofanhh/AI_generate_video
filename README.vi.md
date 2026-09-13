<a id="top"></a>

<div align="center">

<img src="./assets/logo.svg" alt="AI Coding" width="96" />

<h1>AI&nbsp;Coding&nbsp;·&nbsp;Template&nbsp;Video</h1>

<p><b>Đưa vào một bài báo, nhận về một video 9:16.</b><br/>
Một câu lệnh, không cần dựng phim, chạy lại bao nhiêu lần cũng ra y hệt.</p>

<p>
<img alt="Node" src="https://img.shields.io/badge/Node-%E2%89%A522-339933?style=flat-square&logo=node.js&logoColor=white" />
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white" />
<img alt="HyperFrames" src="https://img.shields.io/badge/HyperFrames-0.6.94-ec4899?style=flat-square" />
<img alt="OmniVoice" src="https://img.shields.io/badge/TTS-OmniVoice-f59e0b?style=flat-square" />
<img alt="Format" src="https://img.shields.io/badge/9%3A16-1080%C3%971920-0ea5e9?style=flat-square" />
<img alt="License" src="https://img.shields.io/badge/License-MIT-10b981?style=flat-square" />
</p>

<p><a href="README.md">English</a> · <b>🌐 Tiếng Việt</b></p>

<sub>
<a href="#-bắt-đầu-nhanh"><b>Bắt đầu nhanh</b></a> ·
<a href="#-cách-hoạt-động"><b>Cách hoạt động</b></a> ·
<a href="#-sử-dụng"><b>Sử dụng</b></a> ·
<a href="#-templates"><b>Templates</b></a>
</sub>

</div>


## 📰 Template thời sự mới (mặc định)

### Newsroom Studio — tạo video trực tiếp trên web

**Đổi template:** dùng **Bộ giao diện** hoặc **Template mặc định** bên trên khung
xem trước để chọn trong 12 mẫu sẵn có. **Áp dụng mọi cảnh** đưa cả video về mẫu
đã chọn. Ở bước **Kịch bản & ảnh**, mỗi cảnh có **Template của cảnh** để phối hợp
nhiều mẫu trong một video; chọn **Theo mẫu mặc định** để bỏ lựa chọn riêng.
Các ô **Nội dung riêng của template** cho phép sửa tiêu đề ngắn, từ khóa, số liệu,
danh sách hoặc hai cột so sánh mà không thay đổi lời đọc. Studio không tự điền
số liệu minh họa vào bản tin. Mẫu chữ/đồ họa giữ ảnh trong thư viện nhưng không
hiển thị ảnh; chỉ mẫu thời sự có ảnh và khung 1:1. Tất cả 12 mẫu hỗ trợ 9:16, 16:9.

Chạy `npm install` rồi `npm run dev`, mở **http://127.0.0.1:4173**.
Studio có bốn bước: nhập link bài viết (hoặc dán nội dung), tạo/chỉnh kịch bản
bằng AI và gán ảnh cho từng cảnh, chọn giọng OmniVoice và nghe thử, rồi xuất video.
Bạn có thể tải thêm JPG/PNG/WebP/GIF và audio mẫu WAV/MP3/M4A/OGG (tối đa 20 MB/tệp).

- **AI:** mặc định dùng Codex CLI đang đăng nhập (`codex login`). Nếu không có
  lệnh `codex` trong PATH, đặt `CODEX_BIN` trong `.env.local` đến executable.
  Mục **Cấu hình AI** cho phép đổi sang API tương thích OpenAI Chat Completions,
  nhập base URL, model và key. API cần hỗ trợ JSON object output.
- **Giọng đọc:** `OMNIVOICE_ENDPOINT` trong `.env.local` trỏ tới OmniVoice Gradio
  (máy hiện tại: `http://127.0.0.1:8001`). Hỗ trợ Voice Design/Clone, audio mẫu,
  lời mẫu tùy chọn (để trống dùng ASR), ngôn ngữ Việt/Anh, tốc độ 0.5–1.5,
  instruct cho clone, inference steps, CFG, denoise, duration và preprocess/postprocess.
  Các đặc điểm Voice Design lấy trực tiếp từ API của OmniVoice.
- **Xuất video:** dùng lại giọng đã nghe thử nếu cài đặt không đổi. Mỗi lần render
  tạo thư mục mới `output/studio-<id>` để không dùng nhầm clip/giọng cũ.
  FFmpeg/ffprobe được cài cục bộ qua npm; có thể ghi đè bằng `FFMPEG_DIR`.
  HyperFrames/Chromium cần tải trong lần render đầu, vì vậy cần Internet.
- **Lưu trữ:** bản nháp lưu trong trình duyệt. Ảnh, audio nghe thử, tiến độ và
  cấu hình AI lưu ở `output/studio-data`. API key nằm trong cấu hình local này,
  không trả về cho trình duyệt và không đưa vào Git. Không chia sẻ thư mục đó.
  Video hoàn tất có trong **Video đã tạo**, kèm MP4, MP3, TXT và JSON để tải.

Studio chỉ lắng nghe trên localhost. Những trang chặn crawl hoặc dựng nội dung
bằng JavaScript có thể cần bạn dán nội dung và tải ảnh thủ công.
`npm run news:preview` vẫn mở bộ mẫu cũ; dừng nó trước khi chạy Studio vì cùng cổng 4173.

Tài liệu tích hợp: [Codex non-interactive](https://developers.openai.com/codex/noninteractive/),
[Chat Completions API](https://platform.openai.com/docs/api-reference/chat/create).

`frame-news` dùng ảnh lớn, thanh nguồn, ngày đăng và tiêu đề. Chọn `theme`:
`slide` (mặc định), `light`, `dark` hoặc `modern`. Hỗ trợ 9:16, 16:9 và 1:1.
Cả hook, body và outro dùng chung phong cách; các template cũ vẫn chạy được.

```bash
npm run news:preview
```

Xuất clip mẫu 8 giây có ảnh minh họa, không cần TTS: `npm run news:render`.
Kết quả: `output/news-preview.mp4` (không có âm thanh).

**Video tiếng Anh:** đặt `voice.language` thành `"English"`, viết tiêu đề,
tên kênh, nội dung cảnh và credit ảnh bằng tiếng Anh. Các nhãn mặc định trên
template tin tức tự chuyển sang tiếng Anh. OmniVoice tạo mẫu tại
`voice/narrator-reference-en.wav` và dùng chung cho toàn bộ video. Nếu bỏ trường
ngôn ngữ, pipeline vẫn dùng tiếng Việt. Khi đổi ngôn ngữ, dùng thư mục output mới
để tránh dùng lại clip hình đã render trước đó.

**Một giọng xuyên suốt:** với OmniVoice Gradio, pipeline tạo một mẫu giọng tổng hợp
và dùng cùng mẫu cho mọi cảnh. Mẫu được lưu tại `voice/narrator-reference.wav`.
Để dùng một mẫu có sẵn, thêm `referenceAudio` và `referenceText` vào `voice`:

```json
"voice": {
  "provider": "omnivoice",
  "speed": 1,
  "referenceAudio": "narrator-reference.wav",
  "referenceText": "Lời nói chính xác trong file giọng mẫu."
}
```

Đường dẫn mẫu tính từ `script.json`. Cache giọng được kiểm tra theo lời đọc và mẫu
giọng; bản audio cũ tạo bằng giọng ngẫu nhiên sẽ không được dùng lại. Nếu sửa hình
hoặc chữ hiển thị, xuất vào thư mục mới vì clip hình vẫn được lưu theo tên cảnh.


Mở [bản xem trước](http://127.0.0.1:4173), đổi theme và tỷ lệ ngay trên trang.
Để thử pipeline với [kịch bản minh họa](examples/news/script.json), sao chép cả
thư mục `examples/news` thành `output/news-demo` (giữ nguyên độ sâu để đường dẫn ảnh đúng), rồi chạy:

```bash
npm run pipeline -- output/news-demo/script.json
```

Cần OmniVoice, FFmpeg và Chromium để xuất video. Ví dụ là nội dung minh họa thiết kế.
Ảnh từ `inputs.images` hoặc `metadata.source.image` được nhúng trước khi render.
Ngày đăng lấy từ `metadata.publishedAt`; không có thì bỏ trống. `caption` là chú thích
tĩnh theo cảnh, còn phụ đề theo lời đọc dùng `script.txt` với CapCut.
Slot đầy đủ: [catalog](templates/CATALOG.md#frame-news--mặc-định-cho-bản-tin).


---

<div align="center">
<img src="./assets/pipeline.svg" alt="url / .txt → Claude Code (/create-template-video) → pipeline (OmniVoice · SFX · HyperFrames · FFmpeg) → video.mp4 + voice.mp3 + script.txt" width="860" />
</div>

> **Vì sao nó đáng tin:** AI chỉ lo phần _nội dung_ (viết kịch bản, chọn template), còn việc
> _dựng hình_ thì để code lo (từng pixel một). Nhờ vậy cùng một `script.json` thì lúc nào cũng ra
> đúng một video — không hên xui, không phải ngồi sửa tay.

Bạn chỉ cần lo phần **chữ**. Còn lại template lo hết thiết kế, bố cục, chuyển động; pipeline lo
TTS, âm thanh, render rồi ghép lại — và đưa cho bạn ba file dùng được ngay với CapCut / TikTok /
Shorts / Reels:

| File         | Dùng để làm gì                               |
| ------------ | -------------------------------------------- |
| `video.mp4`  | Video 9:16 hoàn chỉnh, đã có giọng đọc + SFX |
| `voice.mp3`  | Riêng track giọng đọc — kéo thẳng vào CapCut |
| `script.txt` | File text thô — để CapCut tự bắt phụ đề      |

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

## 🚀 Bắt đầu nhanh

> 📺 **Hướng dẫn chi tiết:** [Xem video hướng dẫn trên YouTube](https://www.youtube.com/watch?v=V08-8KLmbnA)

```bash
git clone https://github.com/insofanhh/AI_generate_video.git
cd AI_generate_video
npm install
# chạy server OmniVoice ở máy bạn, rồi tạo video
```

<table>
<tr>
<td valign="top" width="50%">

**Với Claude Code** — _khuyến nghị_

```text
/create-template-video https://aicodingvn.vercel.app/some-article
```

Claude tự đọc bài, viết `script.json` rồi chạy pipeline luôn cho bạn.

</td>
<td valign="top" width="50%">

**Thủ công** — _tự viết `script.json`_

```bash
npm run pipeline -- output/my-video/script.json
```

Bạn tự kiểm soát từng scene, từng template.

</td>
</tr>
</table>

Vài phút sau → `output/<slug>/video.mp4` (1080×1920).

**Chú ý**: Đã bổ sung thư mục `.agent` rồi nên mọi hướng dẫn này không những hoạt động với Claude Code mà còn có thể hoạt động với các Coding Assistant khác vì tất cả ở đây là skill.

---

## 🎥 Live demo

### 👉 [**▶️ Watch on YouTube Shorts**](https://youtube.com/shorts/LUAgRhPBONg) 👈

[![Watch Demo](https://img.youtube.com/vi/LUAgRhPBONg/maxresdefault.jpg)](https://youtube.com/shorts/LUAgRhPBONg)

---

## 🧠 Cách hoạt động

```mermaid
flowchart LR
    A["📰 URL / .txt"] -->|/create-template-video| B[Claude Code]
    B -->|đọc + viết chữ| C["script.json<br/>renderer: hyperframes"]
    C -->|Zod kiểm tra| D[Template Pipeline]
    D -->|TTS từng scene| E[OmniVoice]
    E -->|ghép + trộn SFX| F[voice.mp3]
    D -->|render từng template| G["HyperFrames<br/>Chromium"]
    G -->|fit clip theo giọng| H["clips/scene-*.mp4"]
    F --> I[ghép audio]
    H --> I
    I -->|🎬| J["video.mp4<br/>1080×1920"]

    style A fill:#0f172a,color:#fff,stroke:#334155
    style B fill:#6366f1,color:#fff,stroke:#6366f1
    style E fill:#f59e0b,color:#fff,stroke:#f59e0b
    style G fill:#ec4899,color:#fff,stroke:#ec4899
    style J fill:#10b981,color:#fff,stroke:#10b981
```

Pipeline chạy 8 bước, lần nào cũng như lần nấy — code ở [`src/render/template-pipeline.ts`](src/render/template-pipeline.ts):

| #   | Bước               | Kết quả                                                       |
| --- | ------------------ | ------------------------------------------------------------- |
| 1   | **Kiểm tra**       | `script.json` được validate theo schema Zod                   |
| 2   | **Văn bản phụ đề** | `script.txt` — gộp toàn bộ `voiceText` (CapCut auto-caption)  |
| 3   | **TTS / scene**    | `voice/scene-<id>.mp3` qua OmniVoice _(idempotent)_           |
| 4   | **Ghép giọng**     | `voice-raw.mp3` chèn 0.3s nghỉ + tính mốc thời gian mỗi scene |
| 5   | **Trộn SFX**       | `voice.mp3` — chèn hiệu ứng âm thanh lên giọng đọc            |
| 6   | **Render clip**    | `clips/scene-<id>-fit.mp4` — template → MP4, fit theo giọng   |
| 7   | **Ghép + mux**     | `video-silent.mp4` → `video.mp4` (ghép giọng vào)             |
| 8   | **Xong**           | in đường dẫn kết quả + tổng thời lượng                        |

---

## ⚡ Cài đặt

<details open>
<summary><b>Yêu cầu môi trường</b></summary>

<br/>

| Mục                   | Cần       | Ghi chú                                                               |
| --------------------- | --------- | --------------------------------------------------------------------- |
| **Node.js**           | ≥ 22      | `node --version`                                                      |
| **FFmpeg + ffprobe**  | bản mới   | phải có trong PATH (`ffmpeg -version`)                                |
| **Chrome / Chromium** | bất kỳ    | HyperFrames dùng để render từng template                              |
| **OmniVoice server**  | đang chạy | TTS local tại `OMNIVOICE_ENDPOINT` (mặc định `http://127.0.0.1:8123`) |
| **Claude Code CLI**   | tuỳ chọn  | chỉ cần cho skill `/create-template-video`                            |

**Cài FFmpeg:**

- **Windows** — `winget install Gyan.FFmpeg`
- **macOS** — `brew install ffmpeg`
- **Linux** — `sudo apt install ffmpeg`

</details>

<details open>
<summary><b>Cấu hình</b> — <code>.env.local</code></summary>

<br/>

Ở đây chỉ có mỗi OmniVoice, lại chạy ngay trên máy nên **chẳng cần API key gì cả.**

```env
TTS_PROVIDER=omnivoice
OMNIVOICE_ENDPOINT=http://127.0.0.1:8123
```

Server chỉ cần nhận `POST /tts` kèm `{ text }` và trả về bytes `audio/mpeg` là đủ.

</details>

---

## 🎬 Sử dụng

**Trong Claude Code** _(khuyến nghị)_ — truyền URL hoặc file `.txt`:

```text
/create-template-video https://aicodingvn.vercel.app/iphone-17-200mp
/create-template-video news/my-article.txt
```

Skill sẽ đọc nội dung, viết `script.json` rồi chạy pipeline. Cách map template và quy tắc đọc số
tiếng Việt mình đã ghi rõ trong [tài liệu skill](.claude/skills/create-template-video/SKILL.md).

**Hoặc chạy pipeline trực tiếp** với `script.json` có sẵn:

```bash
npm run pipeline -- output/<slug>/script.json
```

<details>
<summary><b>📄 Cấu trúc <code>script.json</code></b> (chế độ template)</summary>

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

Vài luật bắt buộc của schema: **3–12 scene**, scene đầu phải là `hook`, scene cuối phải là
`outro`, và mỗi `templateId` đều phải có thật trong `templates/`.

</details>

<details>
<summary><b>📁 Cấu trúc output</b></summary>

<br/>

```
output/<slug>-<timestamp>/
├── script.json          # đầu vào (skill sinh hoặc viết tay)
├── script.txt           # gộp voiceText — cho CapCut auto-caption
├── voice/
│   ├── scene-hook.mp3    # TTS từng scene (idempotent)
│   └── scene-*.mp3
├── voice-raw.mp3        # ghép giọng, chưa SFX (trung gian)
├── voice.mp3           # audio cuối, đã trộn SFX
├── clips/
│   ├── scene-hook.mp4     # clip template đã render (idempotent)
│   └── scene-hook-fit.mp4 # fit theo độ dài giọng của scene
├── video-silent.mp4    # ghép clip, chưa có tiếng (trung gian)
└── video.mp4          # 🎉 thành phẩm — 1080×1920 + voice + SFX
```

> **Chạy lại không sợ tốn công.** Muốn TTS lại scene nào thì xoá `voice/scene-<id>.mp3`, muốn
> render lại scene nào thì xoá `clips/scene-<id>.mp4`, rồi chạy lại pipeline — phần còn lại được
> giữ nguyên, không làm lại từ đầu.

</details>

---

## 🎨 Templates

Mỗi template là một project **HyperFrames** riêng trong `templates/` — `index.html` cho 16:9 và
`compositions/portrait.html` cho 9:16. Bạn chỉ việc điền `inputs`, phần nhìn cứ để template lo.
Danh sách slot đầy đủ xem ở [`templates/CATALOG.md`](templates/CATALOG.md).

| Template                    | Vai trò | Hợp với                                                |
| --------------------------- | :-----: | ------------------------------------------------------ |
| `frame-news` | all | **Mặc định** — ảnh slide thời sự, 4 theme, 3 tỷ lệ |
| `frame-liquid-bg-hero`      |  hook   | Mở đầu — hero aurora với headline + nút CTA            |
| `frame-vignelli`            |  body   | Một con số ấn tượng — nền than tối + accent đỏ         |
| `frame-pentagram-stat`      |  body   | Một số/benchmark — nền tối neon + biểu đồ cột          |
| `frame-bold-poster`         |  body   | Tuyên bố mạnh nhiều dòng + figure số lớn               |
| `frame-build-minimal`       |  body   | Một từ lớn pop từng chữ — tối/cam                      |
| `frame-creative-voltage`    |  body   | Khẩu hiệu sáng tạo — split xanh điện + chữ viết tay    |
| `frame-glitch-title`        |  body   | Tin nóng / công nghệ — glitch RGB-split kiểu cyberpunk |
| `frame-aicoding-list`       |  body   | **Danh sách** 2–5 mục (icon + tag mức độ)              |
| `frame-aicoding-comparison` |  body   | **So sánh** hai thứ đối đầu                            |
| `frame-logo-outro`          |  outro  | End-card tùy chọn — logo glow + tên + tagline + URL    |
| `frame-statement-outro`     |  outro  | Outro thay thế — card đỏ trên nền giấy                 |

> **Thêm template của bạn:** tạo `templates/<id>/` với `index.html`, `compositions/portrait.html`,
> `hyperframes.json`, `meta.json` (+ `NOTICE.md` nếu vendored), rồi thêm một dòng vào `CATALOG.md`.
> Dùng font hỗ trợ tiếng Việt.

---

## 🔊 Hiệu ứng âm thanh (SFX)

SFX nằm trong `assets/sfx/<category>/<name>.mp3`. Với mỗi scene, bộ chọn
([`src/assets/sfx-selector.ts`](src/assets/sfx-selector.ts)) quyết định theo 3 tầng:

```
1. scene.sfx override   → file chỉ định, hoặc { "name": "none" } để tắt
2. khớp ngữ nghĩa        → từ khoá voiceText (cảnh báo→alert, kỷ lục→success, ra mắt→reveal …)
3. mặc định theo type    → hook→hook · body→callout · outro→outro
```

Trong cùng một nhóm, file được chọn bằng cách hash id của scene — nên cùng một script thì luôn ra
cùng SFX, mà các scene khác nhau vẫn nhận được file khác nhau. Thư viện SFX khá nặng nên **không
commit** vào repo:

```bash
npm run sfx:download   # tải thư viện SFX
npm run sfx:filter     # lọc / cắt bớt
```

Chưa tải `assets/sfx/` cũng chẳng sao — pipeline vẫn render ngon, chỉ là video không có tiếng động thôi.

---

## 🛠️ Công nghệ

| Lớp             | Công nghệ                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------- |
| **Runtime**     | Node ≥22 · TypeScript 6 · ESM · [tsx](https://github.com/privatenumber/tsx)               |
| **Render**      | [HyperFrames](https://www.npmjs.com/package/hyperframes) `0.6.94` (HTML→MP4 qua Chromium) |
| **TTS**         | OmniVoice (local)                                                                         |
| **Schema**      | [Zod](https://zod.dev) ^4                                                                 |
| **HTTP**        | axios + [nock](https://github.com/nock/nock)                                              |
| **Concurrency** | [p-limit](https://github.com/sindresorhus/p-limit)                                        |
| **A/V**         | FFmpeg + ffprobe                                                                          |
| **Tests**       | [Vitest](https://vitest.dev) ^4                                                           |
| **Điều phối**   | skill [Claude Code](https://docs.claude.com/en/docs/claude-code/overview)                 |

---

## 🙏 Ghi nhận

- [HyperFrames](https://www.npmjs.com/package/hyperframes) — engine HTML-to-video đứng sau các template
- [OmniVoice](https://github.com/k2-fsa/OmniVoice) — text-to-speech tiếng Việt chạy local
- [html-video](https://github.com/nexu-io/html-video) — ý tưởng HTML-to-video mà dự án này học theo
- [Auto-Create-Video](https://github.com/hoquanghai/Auto-Create-Video) — dự án gốc mà bản này kế thừa và phát triển lên

---

## 💖 Ủng hộ dự án

Nếu dự án giúp bạn tiết kiệm thời gian, bạn có thể:

- ⭐ **Star repo này** — giúp nhiều người biết tới hơn
- 🎓 **[Tham khảo các khoá học của AI Coding trên Udemy](https://www.udemy.com/user/tran-van-huy-7/)**
- 📱 **Theo dõi AI Coding** trên [Facebook](https://www.facebook.com/aicoding2010) · [TikTok](https://www.tiktok.com/@aicoding2010) · [YouTube](https://www.youtube.com/@aicoding2010)
- 💬 Giới thiệu cho một người bạn đang làm nội dung
- 🐛 Báo lỗi hoặc đề xuất tính năng

---

## ⭐ Lịch sử Star

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

**[⬆ Lên đầu trang](#top)**

<sub>Made with ❤️ by <b>AI Coding</b> · <a href="https://aicodingvn.vercel.app/">aicodingvn.vercel.app</a></sub>

</div>

Khi nguồn trả HTTP 401/403 hoặc không cung cấp đủ nội dung, Studio hiển thị hướng dẫn mở bài gốc và cho dán nội dung hoặc nhập file TXT UTF-8 ngay tại bước Bài viết. Studio giữ đúng URL nguồn, không dùng bài cũ cho link mới, và chỉ thay bản nháp khi bấm Dùng nội dung này. Đây là cách nhập nội dung bạn truy cập được; Studio không tự vượt đăng nhập hay giới hạn truy cập của nhà xuất bản.
