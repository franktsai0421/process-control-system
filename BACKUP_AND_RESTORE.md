[Tiếng Việt](BACKUP_AND_RESTORE.md) | [繁體中文](BACKUP_AND_RESTORE.zh-TW.md) | [English](BACKUP_AND_RESTORE.en.md)

# BACKUP_AND_RESTORE

## Sao lưu Local

Mặc định .local-backups trong repository root, bị Git ignore. PROCESS_BACKUP_PATH có thể đặt vị trí Local rõ ràng; đường mạng/URL bị từ chối. Không sửa hoặc chạy phục hồi bản cũ trong quy trình cộng tác.

## Đồng bộ và phục hồi

data:sync kiểm tra sao lưu vật lý gồm D1/WAL/SHM, R2 metadata/blob và thiết lập Session/cơ sở trước khi ghi revision. Thất bại xác minh sẽ phục hồi, giữ bản thất bại riêng; phục hồi thất bại là dừng cứng. Dừng dev trước CLI.

## ZIP cũ và quyền

ZIP máy chủ Windows dùng AES-256-GCM, manifest SHA-256 và khóa riêng không nằm trong ZIP. Giữ khóa ngoại tuyến; mất khóa không giải mã được. Restore/delete cũ yêu cầu xác thực ADMIN và xác nhận. Demo không có mật khẩu, không thay thế xác thực đó. Cài dịch vụ Windows tùy chọn chưa được chạy trong thiết lập GitHub này.
