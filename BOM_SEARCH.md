[Tiếng Việt](BOM_SEARCH.md) | [繁體中文](BOM_SEARCH.zh-TW.md) | [English](BOM_SEARCH.en.md)

# BOM_SEARCH

## Tìm kiếm

Tìm theo SKU, tên, chuyền và danh mục. Không đoán metadata thiếu; tìm tiếng Việt bỏ dấu và ưu tiên SKU chính xác. Nhãn hỗ trợ hai ngôn ngữ nhưng không dịch giá trị lưu.

## Cây và nhánh

Danh sách preorder cấp 0–4: lấy hậu duệ liên tiếp đến peer/ancestor, hiển thị cấp tương đối với SKU riêng ở L0. BOM độc lập ưu tiên; nếu thiếu thì tìm nhánh trong thành phẩm. Khác cấu trúc/số lượng/đơn vị giữ thành nhánh riêng; không ghép nhánh anh em hoặc tự đổi số lượng.

## Kiểm thử

node scripts/test-bom-search.cjs public/process kiểm tra fixture không ghi shared records. Thiếu hậu duệ hiển thị thiếu dữ liệu, không thay bằng toàn bộ BOM cha.
