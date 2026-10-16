// Chèn thông tin DPI (mật độ điểm ảnh) vào file PNG bằng cách thêm chunk "pHYs" theo chuẩn PNG.
// Canvas.toBlob() không tự ghi DPI vào file, nên ảnh xuất ra luôn bị mặc định 96 DPI dù
// kích thước pixel đã được tính đúng theo DPI người dùng chọn. Hàm này sửa lại đúng giá trị DPI
// thật vào metadata file, để khi mở bằng Photoshop/Explorer/máy in sẽ đọc đúng DPI đã chọn.

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const buildPhysChunk = (dpi) => {
  // PNG lưu mật độ theo pixel/mét (không lưu trực tiếp DPI/inch).
  const pixelsPerMeter = Math.round(dpi / 0.0254);

  const typeAndData = new Uint8Array(4 + 9); // 4 byte type "pHYs" + 9 byte data
  typeAndData.set([0x70, 0x48, 0x59, 0x73], 0); // "pHYs"
  const dataView = new DataView(typeAndData.buffer);
  dataView.setUint32(4, pixelsPerMeter, false); // pixels per unit, X
  dataView.setUint32(8, pixelsPerMeter, false); // pixels per unit, Y
  typeAndData[12] = 1; // unit specifier: 1 = mét

  const crc = crc32(typeAndData);

  const chunk = new Uint8Array(4 + typeAndData.length + 4);
  const chunkView = new DataView(chunk.buffer);
  chunkView.setUint32(0, 9, false); // length của phần data (không tính type)
  chunk.set(typeAndData, 4);
  chunkView.setUint32(4 + typeAndData.length, crc, false);
  return chunk;
};

// Nhận vào Blob PNG (từ canvas.toBlob) và DPI mong muốn, trả về Blob PNG mới có chèn chunk pHYs.
export async function setPngDpi(blob, dpi) {
  if (!blob || !Number.isFinite(dpi) || dpi <= 0) return blob;
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Cấu trúc PNG: 8 byte signature + chunk IHDR (length 4 + type 4 + data 13 + crc 4 = 25 byte).
  // IHDR luôn là chunk đầu tiên ngay sau signature nên có thể chèn pHYs ngay sau đó một cách an toàn.
  const ihdrEnd = 8 + 4 + 4 + 13 + 4; // = 33
  if (bytes.length < ihdrEnd || bytes[0] !== 0x89 || bytes[1] !== 0x50) {
    // Không phải PNG hợp lệ, trả lại blob gốc để không làm hỏng file.
    return blob;
  }

  const physChunk = buildPhysChunk(dpi);
  const result = new Uint8Array(bytes.length + physChunk.length);
  result.set(bytes.subarray(0, ihdrEnd), 0);
  result.set(physChunk, ihdrEnd);
  result.set(bytes.subarray(ihdrEnd), ihdrEnd + physChunk.length);

  return new Blob([result], { type: 'image/png' });
}

export default setPngDpi;
