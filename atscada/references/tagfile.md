# Bước 2 - TagFile (cho desktop app)

TagFile là file `iDriver` của desktop app đọc để kết nối tới ATDriver Server. Nó đặt lại tên cho gọn và dễ hiểu; phía client mọi tag được gọi là **`Task.TagName`**. Tên này xuất hiện ở mọi nơi phía sau (desktop app, logger, bảng alarm, web), nên chốt với người dùng trước khi làm tiếp.

## Cấu trúc

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Root>
  <Driver>
    <DriverLoader Value="AT" />
    <DriverName Value="ATDriverClient" />
    <DriverAddress Value="localhost|5000" />
    <DriverFT Value="30000" />
    <DriverRedundancy Value="" />
  </Driver>
  <Task>
    <TaskName Value="Meter1" />
    <TaskRate Value="1000" />
    <Tag Offset="0" Scale="1" DriverLoader="AT" TagAddress="MB_TCP.Meter1.Power_P" TagName="Power_P" />
  </Task>
</Root>
```

## Quy tắc

- `TagAddress` = đúng `ChannelName.DeviceName.TagName` trong ATFile, khớp từng ký tự. Sinh từ ATFile bằng script (`gen.js` làm việc này), không gõ tay.
- **Mỗi Device là một `<Task>`**, `TaskName` mặc định bằng tên Device. Vì vậy tên Device phải duy nhất trong cả ATFile. Muốn tên Task khác tên Device thì đặt `task: '...'` cho device trong `model.js`.
- `TagName` mặc định giữ tên tag của ATFile. Đổi cho dễ hiểu khi tên gốc khó đọc (`Voltage_L1` thay cho `U1`) bằng `alias` trong `model.js`. Không dấu, không dấu cách, không dấu chấm; không trùng trong một task.
- Đặt tên tag có hệ thống để các bước sau sinh hàng loạt được: cùng một đại lượng thì cùng một tên ở mọi thiết bị (`Power_P`, `Current`, `Energy_total`), ngưỡng alarm là `Hi_<Tag>` / `Lo_<Tag>`, trạng thái là `State` (0 dừng / 1 chạy / 2 sự cố), `Run`, `Fault`.
- `DriverLoader` ở `<Driver>` và ở từng `<Tag>` phải cùng một giá trị (nhãn tự đặt, mặc định `AT`).
- `DriverAddress` = `<IP máy chạy ATDriver Server>|<số>`. Một máy thì `localhost`. Con số sau dấu `|` là tham số của ATDriverClient, không phải cổng mạng (cổng kết nối tới ATDriver Server cố định trong DLL); giữ `5000` trừ khi người dùng bảo đổi. Máy khác thì đặt `PROJECT.driverAddress` trong `model.js`.
- `Offset` / `Scale`: giá trị hiển thị = giá trị thô x Scale + Offset. Driver không scale, nên hệ số nhân của thanh ghi đặt ở đây. Mặc định `0` và `1`.
- `TaskRate` (ms): mặc định `1000`. Đặt nhỏ hơn (100-500) khi cần cập nhật nhanh và số tag ít; đặt bằng `PROJECT.taskRate` hoặc `taskRate` của device.
- File lưu UTF-8 có BOM, xuống dòng CRLF.
- Trong desktop app file này phải tên là **`Tag_file.XML`** và nằm cạnh file exe. `gen.js` ghi hai bản: ở gốc project và trong `DesktopApp\`; csproj chép bản sau ra thư mục build.

## Hệ nhiều máy

Tag ở nhiều ATDriver Server khác nhau thì TagFile có nhiều khối `<Driver>` với `DriverLoader` khác nhau, và mỗi `<Tag>` ghi `DriverLoader` của máy chứa nó. Bộ sinh file mẫu chỉ làm trường hợp một máy; hệ nhiều máy thì hỏi người dùng sơ đồ rồi mở rộng `lib/tags.js`.

## Kiểm tra

- Mọi `TagAddress` tồn tại trong ATFile (sinh bằng script thì luôn đúng).
- Không trùng `TaskName`; không trùng `TagName` trong một task.
- Parse được XML.
- Sau khi sửa ATFile phải sinh lại TagFile và **build lại hoặc chép lại** `Tag_file.XML` cạnh exe, rồi mở lại ATFile trong ATDriver Server; quên một trong hai là tag mới không có giá trị.
