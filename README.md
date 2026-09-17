[Tiếng Việt](README.md) | [繁體中文](README.zh-TW.md) | [English](README.en.md)

# PROCESS OS — Hệ thống kiểm soát quy trình

## Mục tiêu

Quản lý dữ liệu sản xuất đã duyệt, BOM và phiên bản quy trình trong một cổng nội bộ. Canonical cung cấp cơ sở chung có thể rà soát qua Git; mỗi người làm việc trên Local riêng.

## Chức năng chính

Danh mục sản phẩm và thiết bị, BOM, sơ đồ quy trình, duyệt phiên bản, điều phối, phát trên chuyền, trạng thái sản phẩm, vai trò và sao lưu. Giao diện hỗ trợ tiếng Việt và tiếng Hoa phồn thể.

## Kiến trúc

React/Vinext/TypeScript cung cấp phần chủ và API; giao diện hiện hữu ở public/process. Vite/Miniflare chạy Local; D1 lưu trạng thái và R2 lưu ảnh chụp lớn. Migration ở drizzle.

## Canonical và Local

data/canonical gồm 16 tệp lĩnh vực và manifest, ban đầu 7.971 bản ghi đã duyệt. Đây không phải tệp DB. Local D1/R2 là bản làm việc riêng và không vào Git. Merge chỉ thay đổi Canonical, không ghi Cloudflare.

## Clone lần đầu

Dùng tài khoản GitHub đã được cấp quyền để clone repository Private rồi chuyển vào repository root. Không nhập dữ liệu từ bản cũ hoặc bản sao lưu.

```sh
git clone https://github.com/franktsai0421/process-control-system.git
cd process-control-system
```

## Cài đặt phụ thuộc

Cần Node đáp ứng engines trong package.json (>=22.13.0) và npm. Cài đặt cần mạng registry; đây là bước riêng với runtime Local. Không cần Cloudflare Token hoặc mật khẩu của Frank.

```sh
npm install
```

## Khởi động

Chạy lệnh và mở URL 127.0.0.1 được in ra, thêm /process/. Khởi tạo thất bại sẽ dừng máy chủ.

```sh
npm run dev
```

## Khởi tạo dữ liệu

Chỉ DB Local trống được áp dụng hai migration hiện có, nhập Canonical mới nhất và tạo demo-admin/demo-rd/demo-staff. Schema/bootstrap ban đầu là 1; manifest kiểm tra digest. Khởi động lại không nhập lại hoặc đặt lại dữ liệu.

## Lối vào demo

ADMIN, RD, STAFF giữ tên, vị trí và quyền hiện hữu. Không dùng mật khẩu mặc định. Backend chọn ba danh tính cố định; Session ký, hạn tám giờ, authMode/sessionType là demo.

## Công tắc demo

DEMO_LOGIN_ENABLED chưa đặt/true cho phép; false từ chối cả đăng nhập mới và Session demo cũ. Không tự tắt vì hostname. Giai đoạn thử nghiệm mặc định mở; trước vận hành chính thức Frank phải xác nhận rõ việc tắt.

## Xuất dữ liệu

Dừng dev trước khi xuất. Chỉ xuất dữ liệu cộng tác được duyệt, ID cố định và thứ tự ổn định; loại tài khoản, lịch sử và dữ liệu nhạy cảm. Không thay đổi thì tệp/phiên bản không đổi. Công cụ không commit hoặc push.

```sh
npm run data:export
```

## Đồng bộ dữ liệu

Sau pull, dừng dev rồi đồng bộ. So sánh ba phía với cơ sở trước; sửa chưa export hoặc xung đột cùng ID sẽ bị chặn. Quan hệ sai bị từ chối; xóa phải có deletedAt. Có sao lưu vật lý đã kiểm tra và phục hồi khi xác minh thất bại.

```sh
git switch main
git pull --ff-only
npm run data:sync
```

## Nhánh và Pull Request

Kiểm tra task:status; task:start tạo nhánh khi chưa có remote. Khi có remote, công cụ dừng thao tác mạng tự động: cập nhật main và sync thủ công trước. task:submit xuất/kiểm tra, không tự merge. Commit và push nhánh công việc; Frank rà soát PR. Không push trực tiếp main hoặc force push.

```sh
npm run task:status
git switch -c data/work-name
npm run task:submit
git add <reviewed-files>
git commit -m "Describe reviewed changes"
git push -u origin data/work-name
```

## Build và kiểm thử

CI chỉ dùng fixture Local; không triển khai. Các script bên dưới tồn tại trong package.json. Kiểm thử trình duyệt cũ cần Playwright đã cài; PLAYWRIGHT_MODULE/CHROME_PATH cung cấp công cụ tùy chọn, không tự tải.

```sh
npm run build
npx --no-install tsc --noEmit
npm run test:demo
npm run test:local-schema
npm run test:local-init
npm run test:canonical
npm run test:data-merge
npm run test:task-safety
npm run test:portable
npm run data:validate
npm run github:preflight
```

## Dữ liệu không được commit

Không commit mật khẩu, hash, Token, Session/Cookie, tài khoản thật, dữ liệu cá nhân, .env/.dev.vars, D1/SQLite/WAL/SHM, R2 blob, sao lưu, archive, log hoặc chẩn đoán. .local-backups bị ignore. Scanner không bảo đảm mọi văn bản tự do đều an toàn; cần rà soát nội dung mới.

```sh
npm run safety:scan
```

## Cách ly Production

Local chỉ loopback, remote bindings bị tắt; công cụ từ chối tham số hoặc cấu hình Production. Không dùng secret thật. Staging chưa được tạo/kết nối: tương lai chỉ là mirror Canonical, với Preview riêng mỗi PR. Production không tự đổi khi merge.

## Giới hạn

205 chỉ mục tài sản nằm trong Git, ảnh gốc nằm trong gói riêng; clone dùng ảnh thay thế. FQC/IQC/IPQC là dữ liệu cộng tác CLI, chưa có giao diện chất lượng mới. Chuyển Local cũ, tài khoản chính thức/hash và kiểm toán phụ thuộc đầy đủ còn ở giai đoạn sau. Quy tắc bảo vệ main phụ thuộc gói GitHub, không coi hướng dẫn là biện pháp kỹ thuật.

## Bản làm việc và tài liệu

repository root là bản Git chính thức; bản cũ chỉ đọc để phục hồi. Không nhập lịch sử hoặc dữ liệu từ bản cũ. Repository nội bộ Private; chưa xác nhận điều khoản công ty nên không có LICENSE mã nguồn mở.

[COLLABORATION](COLLABORATION.md) · [BACKUP_AND_RESTORE](BACKUP_AND_RESTORE.md) · [BOM_SEARCH](BOM_SEARCH.md) · [MASTER_ADMIN_UI](MASTER_ADMIN_UI.md)
