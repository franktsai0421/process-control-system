[Tiếng Việt](COLLABORATION.md) | [繁體中文](COLLABORATION.zh-TW.md) | [English](COLLABORATION.en.md)

# COLLABORATION

## Quy trình làm việc

Dừng dev, export dữ liệu đã duyệt, rà soát diff và scanner, commit/push nhánh rồi mở PR. Frank quyết định merge. Người khác pull main và sync sau khi dừng dev. Không push main trực tiếp.

## Xung đột và xóa

Sửa chưa export hoặc hai phía đổi cùng ID sẽ dừng sync. Giữ cả hai bản để giải quyết thủ công; không chọn bản cuối tự động. Xóa cần deletedAt; thiếu record không phải lệnh xóa. Sau merge dữ liệu thủ công, data:manifest tái tạo metadata dẫn xuất, không chọn record thắng.

## Kiểm tra trước gửi

task:status hiển thị phiên bản và dữ liệu chưa export; task:submit export, kiểm tra quan hệ, scanner và diff, không tự upload. Khi remote đã tồn tại, task:start không tự pull; cập nhật và sync thủ công. Không ghi email nhân viên vào tài liệu.

Frank và nhân viên đều phải dùng nhánh công việc → commit → push nhánh → PR → GitHub Actions → Frank duyệt → Frank merge. Không ai được push trực tiếp hoặc force push main, xóa main; nhân viên không được merge và không dùng quyền Owner/admin để bỏ qua quy trình hằng ngày. CI xanh vẫn cần Frank duyệt. Hook Local chặn push khi đang ở main và push có đích main. Xem EMPLOYEE_WORKFLOW.md.

Repository Private này dùng GitHub Free, chưa có Branch Protection phía máy chủ. GitHub hiện không bắt buộc chặn cộng tác viên Write push trực tiếp main hoặc merge PR. Chỉ Frank merge là quy tắc chính thức của công ty; hook Local chỉ ngăn thao tác nhầm, không phải bảo vệ phía máy chủ. CODEOWNERS xác định Frank là người duyệt cuối cho mã và Canonical, chưa bắt buộc phê duyệt theo gói này. Không thử lại bảo vệ trả phí, đổi chế độ hiển thị hoặc thêm LICENSE nguồn mở.

npm install tự bật hook pre-push Local được quản lý phiên bản qua postinstall. Sau khi cài, chạy npm run collaboration:setup để xác nhận; bắt buộc dùng lệnh này nếu script cài đặt bị tắt. Thiết lập chỉ áp dụng cho repository hiện tại và từ chối thay hook tùy chỉnh có sẵn.
