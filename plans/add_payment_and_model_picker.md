# Kế hoạch bổ sung nút Nạp Credits & Hiển thị Model AI Picker

## 1. Mục tiêu
- **Nút nạp Credits**: Khi người dùng click vào nút Credits ở góc phải Header, mở một Modal nạp tiền (hoặc tích hợp thẳng vào Modal có sẵn) hiển thị thông tin chuyển khoản ngân hàng: **BUI THANH HUNG - VCB
- **Grep:** _(none)_
- **Changed:** `plans/add_payment_and_model_picker.md`
- **Verify:** inline verify passed

## 2026-07-08 05:24 — Task fact card
- **Intent:** phục hồi ảnh cũ mình muốn có các lựa chọn ntn nè bạn
- **Decision:** Tôi sẽ cập nhật trực tiếp phân hệ “Phục hồi ảnh cũ” để có thêm các lựa chọn trực quan giống mẫu bạn gửi, đồng thời cập nhật metadata và kiểm tra lỗi._(Đã dừng)_
- **Grep:** _(none)_
- **Changed:** _(none)_

## 2026-07-08 05:35 grep
- **Patterns:** `999999 | credits | fetchCredits | loadingCredits | setCredits | custom | apiConfig | ai/me | ai | me | gommoApi | api | gommo_api | endpoint | request | fetch | nạp | tài khoản | khoan | model | FALLB`
- **Scope:** (scope: **/*)
- **memory/agent-memory.md** lines 1-215
- **styles/base.css** lines 7-276
- **styles/modules.css** lines 27-172
- **data/config.js** lines 15-68
- **lib/api.js** lines 5-145
- **lib/generate.js** lines 3-125
- **components/ImageUploader.jsx** lines 1-66
- **components/ComparisonSlider.jsx** lines 1-53
- **components/IdPhotoGenerator.jsx** lines 4-142
- **Purpose:** _(agent: bổ sung bằng save_memory_note khi đã hiểu)_

## 2026-07-08 05:38 — Task fact card
- **Intent:** [Trích dẫn từ cuộc trò chuyện]
"null"

tòi đâu ra 999.999 nhỉ bạn. ⚠ Tài khoản của bạn cần có tối thiểu 721 AI Credits. Hiện đang có 0 AI Credits. Vui lòng nạp thêm !
- **Decision:** Tôi sẽ sửa trực tiếp chỗ đang giả lập 999.999 Credits và cập nhật version/changelog.Đúng rồi bạn — số **999.999 Credits** là do app đang có logic giả lập khi bật chế độ **API cá nhân/custom**. Cụ thể code cũ tự set `setCredits(999999)` và hiển thị “Vô hạn”, nên nhìn sai với số dư thật của tài khoản.

Mình đã xử lý theo hướng đúng:
- Bỏ hoàn toàn logic giả lập **999999 / Vô hạn Credits**.
- Badge C
- **Grep:**
  **multi_grep:** Explore · Explore: Tìm kiếm workspace — Found 9 files/206 matches -> 999999 | credits | fetchCredits | loadingCredits | setCredits | custom | apiConfig | ai/me | ai | me | gommoApi | api | gommo_api | endpoint | request 
- **Changed:** `app.jsx`, `manifest.json`, `changelog.json`

## 2026-07-08 05:41 grep
- **Patterns:** `IdPhotoGenerator | outfits | photoSizes | retouch | làm đẹp | lam | dep | trang phục | trang | phuc | toc | hair | gender | giới tính | gioi | tinh | btn-primary | btn | primary | nut | button | cta |`
- **Scope:** (scope: **/*)
- **memory/agent-memory.md** lines 25-231
- **styles/base.css** lines 1-278
- **styles/modules.css** lines 18-24
- **data/config.js** lines 1-59
- **lib/api.js** lines 55-61
- **components/ImageUploader.jsx** lines 38-44
- **components/IdPhotoGenerator.jsx** lines 4-149
- **components/PhotoRestorer.jsx** lines 47-259
- **components/ProfessionalLayout.jsx** lines 5-155
- **lib/promptBuilder.js** lines 2-102
- **Purpose:** _(agent: bổ sung bằng save_memory_note khi đã hiểu)_

## 2026-07-08 05:45 — Task fact card
- **Intent:** [Trích dẫn từ cuộc trò chuyện]
"null"

nút tạo ảnh thẻ mình muốn đưa lên ngay dưới chỗ tải ảnh lên, với trang phục mình muốn thêm nhiều lựa chọn , có thể chọn thêm các kiểu tóc tuỳ thuộc vào giới tính nữa . mục làm đẹp mình muốn có thêm các lựa chọn như ảnh mình gửi .
- **Decision:** ✅ Đã hoàn tất cập nhật theo yêu cầu.

Các thay đổi chính:
- Đưa nút **“Tạo Ảnh Thẻ”** lên ngay dưới khu vực tải ảnh.
- Thêm nhiều lựa chọn **trang phục**: vest, sơ mi, áo dài nhiều màu, đồng phục, công an, quân đội, bác sĩ, tốt nghiệp, thường phục.
- Thêm chọn **giới tính Nam/Nữ**.
- Thêm chọn **kiểu tóc theo giới tính**, có tùy chọn giữ tóc gốc.
- Thêm nhóm **làm đẹp dạng chọn nhiều** giống mẫu b
- **Grep:**
  **multi_grep:** Explore · Explore: Tìm kiếm workspace — Found 10 files/120 matches -> IdPhotoGenerator | outfits | photoSizes | retouch | làm đẹp | lam | dep | trang phục | trang | phuc | toc | hair | gender | giới tính | gioi | tinh | 
- **Changed:** `data/config.js`, `lib/promptBuilder.js`, `components/IdPhotoGenerator.jsx`, `styles/base.css`, `manifest.json`, `changelog.json`
- **Verify:** inline verify passed

<!-- Archived 3 section(s) → memory/memory-2026-07-08.md -->

## 2026-07-08 05:49 grep
- **Patterns:** `Nạp Credits | nap | credits | payment-actions | payment | actions | payment-box | box | showCreditsModal | openCreditsModal | credits-badge | badge | aivideoauto.com/prices | aivideoauto | com | price`
- **Scope:** (scope: **/*)
- **memory/agent-memory.md** lines 7-256
- **styles/base.css** lines 39-285
- **styles/modules.css** lines 28-172
- **data/config.js** lines 63-97
- **lib/api.js** lines 16-20
- **lib/generate.js** lines 5-98
- **components/ComparisonSlider.jsx** lines 31-52
- **components/IdPhotoGenerator.jsx** lines 1-53
- **components/PhotoRestorer.jsx** lines 1-100
- **components/ProfessionalLayout.jsx** lines 134-161
- **lib/promptBuilder.js** lines 3-89
- **lib/modelCatalog.js** lines 73-77
- **lib/mediaJobs.js** lines 113-167
- **memory/memory-2026-07-08.md** lines 12-16
- **Purpose:** _(agent: bổ sung bằng save_memory_note khi đã hiểu)_

<!-- Archived 1 section(s) → memory/memory-2026-07-08.md -->

## 2026-07-08 05:52 grep
- **Patterns:** `credits | fetchCredits | loadingCredits | setCredits | ai/me | ai | me | balance | số dư | so | du | wallet | account | nguoi | dung | user | profile | member | gommoApi | api | gommo_api | endpoint |`
- **Scope:** (scope: **/*)
- **memory/agent-memory.md** lines 1-271
- **styles/base.css** lines 7-293
- **styles/modules.css** lines 3-118
- **Purpose:** _(agent: bổ sung bằng save_memory_note khi đã hiểu)_

<!-- Archived 2 section(s) → memory/memory-2026-07-08.md -->

## 2026-07-08 05:56 grep
- **Patterns:** `credits | fetchCredits | loadingCredits | setCredits | extractCredits | ai/me | ai | me | balance | wallet | số dư | so | du | account | nguoi | dung | user | profile | member | gommoApi | api | gommo`
- **Scope:** (scope: **/*)
- **memory/agent-memory.md** lines 1-269
- **styles/base.css** lines 8-293
- **styles/modules.css** lines 4-81
- **Purpose:** _(agent: bổ sung bằng save_memory_note khi đã hiểu)_

<!-- Archived 1 section(s) → memory/memory-2026-07-08.md -->

## 2026-07-08 06:23 grep
- **Patterns:** `download | Tải xuống | xuong | href={result} | href | result | download className | classname | exportImage | toDataURL | link.click | link | click | result-image | image | anh | img | picture | photo`
- **Scope:** (scope: **/*)
- **memory/agent-memory.md** lines 20-240
- **styles/base.css** lines 41-193
- **styles/modules.css** lines 17-147
- **data/config.js** lines 1-104
- **lib/api.js** lines 27-145
- **lib/generate.js** lines 10-114
- **components/ImageUploader.jsx** lines 7-60
- **components/ComparisonSlider.jsx** lines 1-59
- **components/IdPhotoGenerator.jsx** lines 3-222
- **components/PhotoRestorer.jsx** lines 3-224
- **components/ProfessionalLayout.jsx** lines 3-179
- **lib/promptBuilder.js** lines 5-99
- **lib/mediaJobs.js** lines 1-169
- **Purpose:** _(agent: bổ sung bằng save_memory_note khi đã hiểu)_

<!-- Archived 2 section(s) → memory/memory-2026-07-08.md -->

## 2026-07-08 06:38 grep
- **Patterns:** `ModelPicker | model-picker | model | picker | getPriceForModelWithSettings | generatePhoto | handleGenerate | ComparisonSlider | compare-container | compare | container | result-display | result | dis`
- **Scope:** (scope: **/*)
- **memory/agent-memory.md** lines 14-243
- **styles/base.css** lines 55-322
- **styles/modules.css** lines 17-174
- **data/config.js** lines 100-104
- **lib/api.js** lines 30-181
- **lib/generate.js** lines 4-120
- **components/ImageUploader.jsx** lines 55-61
- **components/ComparisonSlider.jsx** lines 1-59
- **components/IdPhotoGenerator.jsx** lines 1-27
- **Purpose:** _(agent: bổ sung bằng save_memory_note khi đã hiểu)_

<!-- Archived 1 section(s) → memory/memory-2026-07-08.md -->

## 2026-07-08 06:47 grep
- **Patterns:** `ModelPicker | model-picker | model | picker | Lựa chọn Model AI | lua | chon | ai | Phông nền | phong | nen | Giới tính | gioi | tinh | Trang phục | trang | phuc | Kiểu tóc | kieu | toc | Làm đẹp | la`
- **Scope:** (scope: **/*)
- **memory/agent-memory.md** lines 36-245
- **styles/base.css** lines 8-344
- **styles/modules.css** lines 28-174
- **data/config.js** lines 15-104
- **lib/api.js** lines 6-180
- **lib/generate.js** lines 5-125
- **components/ImageUploader.jsx** lines 19-23
- **components/ComparisonSlider.jsx** lines 1-56
- **components/IdPhotoGenerator.jsx** lines 3-37
- **Purpose:** _(agent: bổ sung bằng save_memory_note khi đã hiểu)_

<!-- Archived 1 section(s) → memory/memory-2026-07-08.md -->

## 2026-07-08 07:01 grep
- **Patterns:** `ProfessionalLayout | Layout In Ấn | layout | in | an | layout-container | container | layout-paper | paper | layout-photo | photo | anh | image | img | picture | renderLayout | exportImage | paperSize`
- **Scope:** (scope: **/*)
- **memory/agent-memory.md** lines 2-236
- **styles/base.css** lines 7-378
- **Purpose:** _(agent: bổ sung bằng save_memory_note khi đã hiểu)_

## 2026-07-08 07:21 grep
- **Patterns:** `exportStatus | ProfessionalLayout | layout-paper-pro | layout | paper | pro | previewScale | exportImage | Xuất | export | setExportStatus | useState | layout-container | container | layout-paper | la`
- **Scope:** (scope: **/*)
- **memory/agent-memory.md** lines 8-242
- **styles/base.css** lines 41-374
- **styles/modules.css** lines 17-215
- **data/config.js** lines 1-104
- **lib/api.js** lines 1-90
- **Purpose:** _(agent: bổ sung bằng save_memory_note khi đã hiểu)_

<!-- Archived 1 section(s) → memory/memory-2026-07-08.md -->

## 2026-07-08 07:24 — Task fact card
- **Intent:** Fix lỗi runtime trong Code Chat preview.

Yêu cầu:
- Đọc lỗi bên dưới và sửa trực tiếp các file Mini App bằng write_file (full file) hoặc edit_file — KHÔNG chỉ giải thích.
- Nếu lib/gommoApi.js bị lẫn markdown/memory, write_file lại TOÀN BỘ file sạch (toItems + gommoApi gọi window.gommoMiniApp.call).
- Nếu tool báo content unchanged nhưng file vẫn lỗi → nội dung bạn gửi trùng file hỏng; phải ghi nội dung KHÁC hoàn toàn.

Runtime error:
```text
Uncaught ReferenceError: exportStatus is not defined
https://unpkg.com/react-dom@18/umd/react-dom.production.min.js:79:227
ReferenceError: exportStatus 
- **Decision:** Mình sẽ áp dụng đúng patch từ pipeline để khai báo `exportStatus`, rồi kiểm tra cú pháp.✅ Đã sửa lỗi runtime `exportStatus is not defined` trong `components/ProfessionalLayout.jsx`.

Nội dung xử lý:
- Thêm state còn thiếu:
  - `exportStatus`
  - `setExportStatus`
- Kiểm tra cú pháp lại file liên quan: **không phát hiện lỗi cú pháp**.

Bạn tải lại preview, mục **Layout In Ấn** sẽ không còn crash kh
- **Grep:**
  **multi_grep:** Explore · Explore: Tìm kiếm workspace — Found 5 files/162 matches -> exportStatus | ProfessionalLayout | layout-paper-pro | layout | paper | pro | previewScale | exportImage | Xuất | export | setExportStatus | useState |
- **Changed:** `components/ProfessionalLayout.jsx`

<!-- Archived 2 section(s) → memory/memory-2026-07-08.md -->