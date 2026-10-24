[Tiếng Việt](README.md) | [繁體中文](README.zh-TW.md) | [English](README.en.md)

# PROCESS OS — Hệ thống điều khiển trung tâm

Nền tảng nội bộ liên kết dữ liệu gốc đã duyệt, BOM, quy trình/phiên bản, gửi sản phẩm vào chuyền, phát quy trình, FQC/IQC/IPQC và thiết bị. Giao diện tiếng Việt/繁體中文. Báo cáo chất lượng, kiểm tra định kỳ và FPY vẫn có phần chỉ là khung giao diện.

## Tài liệu theo công việc

- [AGENTS](AGENTS.md): quy tắc kỹ thuật; dùng checkout, branch, HEAD và thay đổi chưa commit đang mở.
- [Yêu cầu hiện hành](docs/specs/current/README.md), [triển khai thực tế](AI_CONTEXT/AI_CONTEXT.md), [mô hình dữ liệu](AI_CONTEXT/DATA_MODEL.md).
- [HANDOFF](HANDOFF.md): tiến độ hiện tại; [chỉ mục](docs/DOCUMENTATION_INDEX.md): tài liệu, lịch sử và điểm chưa thống nhất.
- [Quy trình nhân viên](EMPLOYEE_WORKFLOW.md); [Canonical/Local](AI_CONTEXT/LOCAL_DATA_COLLABORATION.md).
- Khi cần: [sao lưu](BACKUP_AND_RESTORE.md), [BOM](BOM_SEARCH.md), [dữ liệu gốc](MASTER_ADMIN_UI.md), [phát hành](DEPLOYMENT.md).

## Chạy và kiểm tra

Dùng engines/scripts trong package.json. Clone mới cần cài dependencies và collaboration:setup; sửa nhỏ không cần cài lại công cụ. npm run dev thường in URL loopback /process/. Local đã áp dụng V3 phải theo HANDOFF/runtime để không vô tình chạy lại khởi tạo dữ liệu.

Chọn kiểm tra fixture/type/build theo ảnh hưởng; UI kiểm tra desktop/màn hình hẹp và hai ngôn ngữ. Chỉ sửa tài liệu: kiểm tra liên kết/diff, không chạy cả bộ kiểm thử. data:export/data:sync thay đổi Local: chỉ chạy khi công việc cần, dừng dev và bảo vệ dữ liệu chưa export. Git pull/merge không cập nhật DB.

Nhánh công việc và PR cần Frank duyệt/merge; không push main trực tiếp. Hook Local không phải bảo vệ máy chủ. Không đưa tài khoản, mật khẩu/token, Local D1/R2, ảnh gốc hoặc backup vào Git. Production/Site theo DEPLOYMENT và phê duyệt SHA cụ thể. Số liệu, cờ demo, khởi tạo và ảnh chỉ được duy trì ở nguồn liên kết.
