# PROCESS OS — phát triển Local

Yêu cầu Node.js 22.13 trở lên và npm:

```sh
npm install
npm run dev
```

Mở địa chỉ `127.0.0.1` hiển thị trên terminal, thêm `/process/`. Các lối vào ADMIN, RD và STAFF giữ nguyên giao diện/quyền; không cần mật khẩu của Frank, Cloudflare Token hay cấu hình Production.

Trong giai đoạn thử nghiệm, đăng nhập demo mặc định được mở. Trước khi vận hành chính thức, Frank phải xác nhận rõ việc tắt. `DEMO_LOGIN_ENABLED=false` từ chối cả đăng nhập mới và Session demo đã cấp.

Local mới được khởi tạo từ `data/canonical/` bằng migration hiện có. Dữ liệu Local cũ không bị reset. Ảnh gốc nằm ngoài Git; bản clone dùng ảnh thay thế và chỉ mục tài sản theo SHA-256.

Dừng dev trước khi chạy:

```sh
npm run task:status
npm run task:start -- data/work-name
npm run data:export
npm run data:sync
npm run task:submit
```

Export không commit/push. Sync so sánh ba phía, sao lưu trước khi cập nhật, từ chối thay đổi chưa export/xung đột và phục hồi khi ghi thất bại. Merge chỉ cập nhật Canonical; không ghi Cloudflare. Chưa có remote thì công cụ không giả lập pull thành công.

Không đưa `.env`, Session, SQLite/WAL/SHM, Local R2, bản sao lưu hay secret vào Git. Xem [quy trình chi tiết](AI_CONTEXT/LOCAL_DATA_COLLABORATION.md). Staging chỉ là đặc tả tương lai; Production không thuộc phạm vi các công cụ này.
