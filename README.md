# ATSCADA Codex Skill

Hướng dẫn và công cụ mẫu để Codex tạo, sửa và kiểm tra dự án ATSCADA trên Windows. Skill gồm `SKILL.md`, tài liệu driver, script kiểm tra môi trường và bộ sinh file mẫu.

## Cài đặt

Trong Codex, yêu cầu: `Dùng $skill-installer để cài skill từ https://github.com/gooduselabs/atscada-skill/tree/main/atscada`.

Hoặc tải repository và chép nguyên thư mục `atscada/` vào `~/.codex/skills/` (Windows: `%USERPROFILE%\.codex\skills\`). Mở cuộc trò chuyện Codex mới sau khi cài.

## Sử dụng

Gọi `$atscada` và mô tả yêu cầu, ví dụ: `$atscada tạo ATFile cho Modbus TCP`. Cần có Node.js để dùng bộ sinh file; build ứng dụng mẫu cần môi trường ATSCADA và Visual Studio/MSBuild trên Windows.

Các địa chỉ thiết bị và thông số trong mẫu chỉ để minh họa. Cung cấp thông tin kết nối và mật khẩu riêng cho dự án của bạn trước khi sinh file.

## Giấy phép

MIT. Xem [LICENSE](LICENSE).
