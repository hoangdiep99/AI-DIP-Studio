# Agent workspace memory

Ghi chú tự động + thủ công từ grep/read. Đọc file này ở đầu task trước khi search/read lại.

## 2026-07-08 08:22 grep
- **Patterns:** `Tải xuống | xuong | downloadMediaFile | Sắp xếp | sap | xep | layout | layoutQueue | setActiveTab | activeTab | IdPhotoGenerator | PhotoRestorer | ProfessionalLayout | resultMeta | generation-meta | g`
- **Scope:** (scope: **/*)
- **styles/base.css** lines 55-378
- **styles/modules.css** lines 17-245
- **data/config.js** lines 100-104
- **lib/api.js** lines 3-177
- **Purpose:** _(agent: bổ sung bằng save_memory_note khi đã hiểu)_

## 2026-07-08 08:45 grep
- **Patterns:** `ProfessionalLayout | layout-upload | layout | upload | Thêm ảnh vào layout | them | anh | vao | image | img | drag | drop | onDrop | onDragOver | uploader-zone | uploader | zone | layout-drop | export`
- **Scope:** (scope: **/*)
- **memory/agent-memory.md** lines 3-9
- **styles/base.css** lines 23-396
- **styles/modules.css** lines 1-220
- **data/config.js** lines 6-104
- **lib/api.js** lines 27-182
- **lib/generate.js** lines 10-114
- **components/ImageUploader.jsx** lines 1-64
- **components/ComparisonSlider.jsx** lines 1-67
- **components/IdPhotoGenerator.jsx** lines 1-380
- **components/PhotoRestorer.jsx** lines 1-322
- **components/ProfessionalLayout.jsx** lines 7-20
- **Purpose:** _(agent: bổ sung bằng save_memory_note khi đã hiểu)_

## 2026-07-08 09:23 grep
- **Patterns:** `app-main | app | main | mini | miniapp | mini_app | spec | workspace | ws-content | ws | content | result-display | result | display | Kết Quả | ket | qua | hiển thị ảnh | hien | anh | image | img | p`
- **Scope:** (scope: **/*)
- **memory/agent-memory.md** lines 1-18
- **styles/base.css** lines 41-396
- **styles/modules.css** lines 17-280
- **data/config.js** lines 1-29
- **Purpose:** _(agent: bổ sung bằng save_memory_note khi đã hiểu)_

## 2026-07-08 09:25 — Task fact card
- **Intent:** bạn thêm nút liên hệ tác giả . nút ấn vào sẽ bật link fb mình https://www.facebook.com/diepfoto. các thông tin này để ở dưới cùng app nhé, chỗ dưới mục hieenr thị ảnh ý
- **Decision:** Mình sẽ kiểm tra cú pháp các file vừa được pipeline cập nhật để đảm bảo footer liên hệ tác giả hoạt động ổn. 
 
✅ Đã thêm nút **Liên hệ tác giả** ở dưới cùng app.

Nội dung cập nhật:
- Thêm khối **Liên hệ tác giả AI DIP Studio** ngay dưới khu vực hiển thị chính của app.
- Nút **“💬 Liên hệ Facebook”** mở link: https://www.facebook.com/diepfoto
- Style nút nổi bật, dễ bấm trên mobile.
- Cập nhật `m
- **Grep:**
  **multi_grep:** Explore · Explore: Tìm kiếm workspace — Found 4 files/160 matches -> app-main | app | main | mini | miniapp | mini_app | spec | workspace | ws-content | ws | content | result-display | result | display | Kết Quả | ket | 
- **Changed:** `manifest.json`, `app.jsx`, `styles/base.css`, `changelog.json`
- **Verify:** inline verify passed

## Memory archive index
Các bản ghi cũ (đọc bằng read_file khi cần tra cứu sâu):
- `memory/memory-2026-07-08.md`