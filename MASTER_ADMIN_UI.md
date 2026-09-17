[Tiếng Việt](MASTER_ADMIN_UI.md) | [繁體中文](MASTER_ADMIN_UI.zh-TW.md) | [English](MASTER_ADMIN_UI.en.md)

# MASTER_ADMIN_UI

## Danh mục và duyệt

AB/C dùng quy trình draft/submit/approve hiện hữu. Nhóm danh mục có thể rỗng; đổi/xóa chỉ tác động chuyền đó. Snapshot cũ/approved/pending chỉ đọc; chỉ approve áp dụng danh mục đang dùng. Cancel/Escape không ghi.

## Chuyền và SAMPLE

Tab riêng quản lý chuyền/công đoạn. Form ngăn ID trùng và lựa chọn sai chuyền; đổi chuyền bỏ route cũ. Submit cần ID/tên không rỗng và ít nhất một công đoạn, không tự thêm yêu cầu phân bổ BOM. SAMPLE là demo bộ nhớ, không ghi dữ liệu thật.

## Trao đổi Excel

bom-excel.js xuất BOM chọn, tất cả BOM hoặc mẫu; subtree bán thành phẩm có L0 riêng. Import kiểm tra root/cấp trước xác nhận, thay chỉ root hoàn chỉnh được đưa vào. Cancel/Excel lỗi không đổi dữ liệu. Giữ số lượng/đơn vị/waste; không tự đổi.

## Kiểm thử

Chạy test-master-admin.cjs, test-bom-excel.cjs và test-bom-search.cjs bằng Node với public/process; fixture kiểm tra 6.214 dòng BOM và XLSX roundtrip, không dùng Production.
