> Trạng thái: bản đọc hiện hành. Nguồn chính: [BACKUP_AND_RESTORE.zh-TW.md](BACKUP_AND_RESTORE.zh-TW.md). Bản dịch không thêm quy tắc riêng.

[Tiếng Việt](BACKUP_AND_RESTORE.md) | [繁體中文](BACKUP_AND_RESTORE.zh-TW.md) | [English](BACKUP_AND_RESTORE.en.md)

# BACKUP_AND_RESTORE

Trước khi thay dữ liệu, khôi phục vật lý từ chối tắt chức năng thu hồi phiên đang bật, thiếu bảng của chức năng đã bật, hoặc bản sao không có bảng phản hồi khi hiện tại đã có lịch sử. Ảnh, dữ liệu canonical, schema và thiết lập bổ sung của adoption đều được kiểm tra và khôi phục đầy đủ, không bỏ qua.

Bản sao lưu vật lý giữ cả Local features.json. Khôi phục kiểm tra tệp trong staging và hợp nhất các phiên đã thu hồi mới hơn trước khi thay dữ liệu; giữ giá trị expires_at/revoked_at lớn nhất cho từng token. Khôi phục ZIP cũng giữ các phiên đã thu hồi và từ chối bản sao cũ không có bảng phản hồi khi hiện tại đã có lịch sử phản hồi. Nếu đã có dữ liệu nghiệp vụ mới, phải bảo toàn dữ liệu mới nhất và bù trừ theo CAS, không ghi đè toàn bộ bằng bản cũ. Xem [biên bản tích hợp và khôi phục Local](docs/local-integration/20261009-3020-to-3000.md).

## Sao lưu Local

Mặc định .local-backups trong repository root, bị Git ignore. PROCESS_BACKUP_PATH có thể đặt vị trí Local rõ ràng; đường mạng/URL bị từ chối. Không sửa hoặc chạy phục hồi bản cũ trong quy trình cộng tác.

## Đồng bộ và phục hồi

data:sync kiểm tra sao lưu vật lý gồm D1/WAL/SHM, R2 metadata/blob và thiết lập Session/cơ sở trước khi ghi revision. Thất bại xác minh sẽ phục hồi, giữ bản thất bại riêng; phục hồi thất bại là dừng cứng. Dừng dev trước CLI.

## ZIP cũ và quyền

ZIP của website không chứa `.env*`, `.dev.vars*` (kể cả thư mục con) hoặc khóa riêng PEM. Giữ thiết lập bảo mật riêng tư, không đưa vào gói mã công khai hay Git. Khôi phục đầy đủ còn cần D1/R2 riêng, lịch sử, tệp media và thiết lập Local Session/chức năng cần thiết; ZIP website hoặc tập con Canonical không đủ để xác nhận khôi phục toàn bộ. Thiếu khóa, thiết lập cần thiết hoặc media thì chưa thể coi là hoàn tất.

ZIP máy chủ Windows dùng AES-256-GCM, manifest SHA-256 và khóa riêng không nằm trong ZIP. Giữ khóa ngoại tuyến; mất khóa không giải mã được. Restore/delete cũ yêu cầu xác thực ADMIN và xác nhận. Demo không có mật khẩu, không thay thế xác thực đó. Cài dịch vụ Windows tùy chọn chưa được chạy trong thiết lập GitHub này.
