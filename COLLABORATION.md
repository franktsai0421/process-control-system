[Tiếng Việt](COLLABORATION.md) | [繁體中文](COLLABORATION.zh-TW.md) | [English](COLLABORATION.en.md)

# COLLABORATION

## Quy trình làm việc

Dừng dev, export dữ liệu đã duyệt, rà soát diff và scanner, commit/push nhánh rồi mở PR. Frank quyết định merge. Người khác pull main và sync sau khi dừng dev. Không push main trực tiếp.

## Xung đột và xóa

Sửa chưa export hoặc hai phía đổi cùng ID sẽ dừng sync. Giữ cả hai bản để giải quyết thủ công; không chọn bản cuối tự động. Xóa cần deletedAt; thiếu record không phải lệnh xóa. Sau merge dữ liệu thủ công, data:manifest tái tạo metadata dẫn xuất, không chọn record thắng.

## Kiểm tra trước gửi

task:status hiển thị phiên bản và dữ liệu chưa export; task:submit export, kiểm tra quan hệ, scanner và diff, không tự upload. Khi remote đã tồn tại, task:start không tự pull; cập nhật và sync thủ công. Không ghi email nhân viên vào tài liệu.
