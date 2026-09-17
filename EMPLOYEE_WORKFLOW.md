[Tiếng Việt](EMPLOYEE_WORKFLOW.md) | [繁體中文](EMPLOYEE_WORKFLOW.zh-TW.md) | [English](EMPLOYEE_WORKFLOW.en.md)

# Quy trình nhân viên

## Repository và trách nhiệm

Frank và nhân viên đều phải dùng nhánh công việc → commit → push nhánh → PR → GitHub Actions → Frank duyệt → Frank merge. Không ai được push trực tiếp hoặc force push main, xóa main; nhân viên không được merge và không dùng quyền Owner/admin để bỏ qua quy trình hằng ngày. CI xanh vẫn cần Frank duyệt. Hook Local chặn push khi đang ở main và push có đích main. Xem EMPLOYEE_WORKFLOW.md.

Repository Private này dùng GitHub Free, chưa có Branch Protection phía máy chủ. GitHub hiện không bắt buộc chặn cộng tác viên Write push trực tiếp main hoặc merge PR. Chỉ Frank merge là quy tắc chính thức của công ty; hook Local chỉ ngăn thao tác nhầm, không phải bảo vệ phía máy chủ. CODEOWNERS xác định Frank là người duyệt cuối cho mã và Canonical, chưa bắt buộc phê duyệt theo gói này. Không thử lại bảo vệ trả phí, đổi chế độ hiển thị hoặc thêm LICENSE nguồn mở.

## Clone lần đầu

npm install tự bật hook pre-push Local được quản lý phiên bản qua postinstall. Sau khi cài, chạy npm run collaboration:setup để xác nhận; bắt buộc dùng lệnh này nếu script cài đặt bị tắt. Thiết lập chỉ áp dụng cho repository hiện tại và từ chối thay hook tùy chỉnh có sẵn.

```sh
git clone https://github.com/franktsai0421/process-control-system.git
cd process-control-system
npm install
npm run collaboration:setup
npm run dev
```

## Đồng bộ ảnh Canonical

Sau npm install và npm run dev, bản clone mới kiểm tra gói ảnh Web có phiên bản và tự nhập ảnh thật vào R2 Local riêng. Cơ sở gồm 205 ảnh, khoảng 7,92 MiB; giữ đủ 7.971 bản ghi Canonical.

Sau khi sửa và duyệt ảnh, dừng dev rồi chạy npm run data:export. Dữ liệu, ảnh Web, assets/manifest.json, assets/web-manifest.json và phiên bản nội dung được xuất cùng nhau. Ảnh cập nhật có asset ID nội dung mới. Xóa liên kết Canonical cuối cùng tạo tombstone deletedAt; ảnh còn được lịch sử tham chiếu vẫn giữ lại. Sau PR được duyệt và merge, đồng nghiệp dừng dev, chạy git pull --ff-only và npm run data:sync, rồi khởi động dev. Sync tạo bản sao lưu đã kiểm tra và từ chối thay đổi Local chưa export. Khởi động lại hoặc sync lặp không ghi lại ảnh hiện có hay đè ảnh tải lên Local.

Git chỉ chứa WebP đã bỏ EXIF/GPS và metadata nhạy cảm (cạnh tối đa 1600px), đường tương đối và manifest SHA-256. Ảnh gốc độ phân giải cao, video và blob R2 Local không vào Git. Giới hạn 2 MiB mỗi ảnh Web, 25 MiB mỗi gói; thiếu nguồn, quá lớn hoặc cùng asset ID khác hash nguồn/Web sẽ dừng, không tự dùng LFS/dịch vụ ngoài. Route ảnh chỉ chạy loopback với cờ Local rõ ràng; không kết nối Staging, Production hay Sites.

## Cập nhật và tạo nhánh công việc

Dừng dev trước. Giữ thay đổi hiện có; xem xét xung đột, không đặt lại dữ liệu Local.

```sh
git switch main
git pull --ff-only
npm run data:sync
git switch -c work/task-name
```

## Gửi mã hoặc dữ liệu đã duyệt

Dừng dev trước data:export. Chỉ xem xét thay đổi đã duyệt, loại tài khoản, trường định danh và lịch sử thao tác. Sau khi push nhánh, tạo PR vào main; nhân viên không merge. Khi CI đạt, Frank duyệt mã và Canonical rồi merge trên GitHub.

```sh
npm run data:export
git diff
npm run build
npx --no-install tsc --noEmit
npm run test:collaboration
npm run github:preflight
git add <reviewed-files>
git commit -m "Describe reviewed changes"
git push -u origin work/task-name
```

## Nhận dữ liệu đã merge

Dừng dev trước pull và sync. Thay đổi chưa export hoặc thay đổi cạnh tranh sẽ dừng đồng bộ để xem xét thủ công.

```sh
git switch main
git pull --ff-only
npm run data:sync
npm run dev
```

## Dữ liệu và an toàn

Git lưu mã, migration, Canonical, tài liệu, kiểm thử và Actions. Không commit Local D1/SQLite/WAL/SHM, blob R2, Session/Cookie, mật khẩu/Token/secret, .env/.dev.vars, bản sao lưu, tệp nén hoặc dữ liệu chẩn đoán. Local không kết nối Staging/Production. Clone/pull/fetch/commit và merge PR bình thường trên web GitHub không bị ảnh hưởng. Nếu thiết lập thất bại, cần người bảo trì xem xét; không ghi đè hook có sẵn. Lối tắt mặc định mở trong giai đoạn thử nghiệm; chỉ Frank xác nhận đóng trước vận hành chính thức.
