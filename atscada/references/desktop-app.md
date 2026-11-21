# Bước 3 - Desktop app (WinForms, .NET Framework)

Desktop app là trung tâm của hệ: nạp `Tag_file.XML` qua `iDriver`, mở `iWebService` cho web đọc/ghi tag, chạy `iDataLogger` và `iAlarmLogger`, và chứa logic riêng của project (tính toán, tổng hợp, mô phỏng). Giao diện của nó làm gọn; phần hiển thị chính là web.

Mục lục: khung project · API của các tool · quy tắc bắt buộc · logger · alarm · đọc và ghi tag · giá trị khởi tạo và liên kết · logic riêng · mô phỏng · tổng hợp theo ngày · tool khác · build

## Khung project

`gen.js` tạo thư mục `DesktopApp\`:

| File | Nguồn | Nội dung |
|---|---|---|
| `<Ten>_App.csproj` | chép một lần | WinExe, x86, .NET Framework 4.8, reference DLL của ATSCADA |
| `Program.cs` | chép một lần | ép `InvariantCulture`, chỉ cho một bản chạy, tham số `--schema` |
| `MainForm.cs` | chép một lần | hàm đọc/ghi tag, khởi tạo, vòng 1 giây, bảng trạng thái task; **logic riêng viết ở đây** |
| `Database.cs` | chép một lần | tạo database/bảng còn thiếu, đọc dòng cuối của bảng log |
| `MainForm.Designer.cs` | sinh lại mỗi lần | khai báo `iDriver`, `iWebService`, các `iDataLogger`, `iAlarmLogger`, nhãn hiển thị |
| `Loggers.g.cs`, `Model.g.cs` | sinh lại mỗi lần | danh sách logger; chuỗi kết nối, DDL, danh sách alarm, liên kết, giá trị khởi tạo |
| `Tag_file.XML` | sinh lại mỗi lần | được chép ra cạnh exe khi build |

File "chép một lần" không bị ghi đè ở các lần sinh sau, nên sửa tay được. File "sinh lại" thì sửa trong `model.js`.

- Reference lấy từ thư mục cài ATSCADA (`$(ATSCADADir)`, mặc định `C:\Program Files\ATPro\ATSCADA`): `iDriver.dll`, `iTools.dll`, `iWebService.dll`, `DriverPluginInterface.dll`, `ToolExtensions.dll`, `MySql.Data.dll`, kèm `System.ServiceModel`, `System.Configuration`, `System.Runtime.Serialization`. DLL khác (`iEnergyTools`, `iLEANTools`, `iWebAPI`...) nằm trong thư mục con cùng tên, chỉ thêm khi dùng tới.
- `iDriver` nạp ATDriver client từ thư mục `Drivers\` cạnh exe, gồm ba file: `ATDriverBase.dll` và `ATDriverWCFInterface.dll` (từ thư mục ATDriver Server), `ATDriverClient.dll` (từ `ATSCADA\Drivers`). csproj mẫu liên kết thẳng tới ba file đó và chép ra `bin\...\Drivers\` khi build.
- Framework là **`v4.8`**. `iTools.dll` của bản ATSCADA hiện tại được build cho .NET Framework 4.8 (các DLL còn lại cho 4.5 đến 4.6), nên app phải từ 4.8 trở lên; đặt thấp hơn thì MSBuild không nhận reference `iTools`. Chỉ đổi `PROJECT.framework` khi máy đích dùng bản ATSCADA cũ có `iTools` build cho framework thấp hơn. Build x86, `Prefer32Bit`.

## API của các tool (lấy từ DLL)

Namespace gốc là `ATSCADA`. Mọi tool có thuộc tính `Driver` trỏ về `iDriver`; mọi tên tag viết `Task.Tag`.

| Lớp | Thuộc tính / phương thức |
|---|---|
| `ATSCADA.iDriver` | `ProjectFile` (đường dẫn `Tag_file.XML`), `GetTaskTimeOut` (ulong, 500), `WaitingTime` (500), `MaxTagWriteTimes` (10), `Designmode` (false); `Task(name)` trả `ITask`; sự kiện `ConstructionCompleted` |
| `ITask` | `Name`, `Rate`, `TagCollection`, `Tag(name)` trả `ITag` |
| `ITag` | `Value` (string), `Status` (string), `TimeStamp`, `Scale`, `Offset`; `ASynWrite(value)`, `SynWrite(value)` trả chuỗi kết quả, `SynRead()`; sự kiện `TagValueChanged`, `TagStatusChanged`, `WriteStatusFeedback` |
| `ATSCADA.WebService.iWebService` | `Driver`, `Server` (mặc định `localhost`), `Port` (uint, mặc định 8010), `EnableMetadata`, `UseExternalConfig`; chỉ đọc: `EffectiveAddress`, `IsListening`, `LastError`; `Restart()`; sự kiện `ServiceStarted`, `ServiceFaulted` |
| `ATSCADA.iWinTools.Logger.iDataLogger` | `Driver`, `DatabaseLog`, `Collection`, `UpdateType` (`Timer`, `Event`, `All`), `LoggingTimerRate`, `AllowLogWhenBad` |
| `ATSCADA.iWinTools.Logger.iAlarmLogger` | `Driver`, `DatabaseLog`, `DatabaseSettings`, `EmailTagName`, `EmailConfigTagName`, `EmailConfig`, `Collection` |
| `ATSCADA.iWinTools.Database.DatabaseParametter` | `ServerName`, `Port` (uint), `UserID`, `Password`, `DatabaseName`, `TableName`, `DatabaseType` (`MySQL`, `MSSQL`) |
| `ATSCADA.iWinTools.Data.iLabel` | `Driver`, `TagName` (hiện giá trị tag) |
| `ATSCADA.iWinTools.Data.iButtonWrite` | `Driver`, `TagName`, `Value`, `ColorWriteSuccess`, `IsFeedBack` |
| `ATSCADA.iWinTools.Data.iInput` | `Driver`, `TagName`, `MaxLength`, `IsFeedBack` |

Mẫu khai báo trong Designer (đúng kiểu `gen.js` sinh ra):

```csharp
this.iDriver1 = new ATSCADA.iDriver();
this.iWebService1 = new ATSCADA.WebService.iWebService(this.components);
this.iDataLoggerMeter1 = new ATSCADA.iWinTools.Logger.iDataLogger(this.components);

this.iDriver1.Designmode = false;
this.iDriver1.GetTaskTimeOut = ((ulong)(500ul));
this.iDriver1.MaxTagWriteTimes = 10;
this.iDriver1.ProjectFile = null;                 // gán sau cùng, trong constructor của form
this.iDriver1.WaitingTime = 500;

this.iWebService1.Driver = this.iDriver1;
this.iWebService1.Port = ((uint)(8010u));
this.iWebService1.Server = "localhost";

this.iDataLoggerMeter1.Driver = this.iDriver1;
this.iDataLoggerMeter1.DatabaseLog.ServerName = "localhost";
this.iDataLoggerMeter1.DatabaseLog.UserID = "root";
this.iDataLoggerMeter1.DatabaseLog.Password = "<project-db-password>";
this.iDataLoggerMeter1.DatabaseLog.DatabaseName = "demoplant";
this.iDataLoggerMeter1.DatabaseLog.TableName = "datalog_meter1";
this.iDataLoggerMeter1.DatabaseLog.DatabaseType = ATSCADA.iWinTools.Database.DatabaseType.MySQL;
this.iDataLoggerMeter1.DatabaseLog.Port = 3306;
this.iDataLoggerMeter1.Collection = "Meter1.Power_P&Power_P&False|Meter1.Energy_total&Energy_total&False";
this.iDataLoggerMeter1.UpdateType = ATSCADA.iWinTools.Logger.UpdateType.Timer;
this.iDataLoggerMeter1.LoggingTimerRate = "\"60000\"";
this.iDataLoggerMeter1.AllowLogWhenBad = false;
```

## Quy tắc bắt buộc

- **Gán `ProjectFile` sau cùng.** Các tool đăng ký sự kiện `ConstructionCompleted` của driver, sự kiện này chỉ phát một lần khi nạp project. Trong constructor của form: `InitializeComponent()` (đặt thông số driver, gán `Driver` cho mọi tool), rồi mới `iDriver1.ProjectFile = Path.Combine(Application.StartupPath, "Tag_file.XML")`. Tool gắn sau dòng đó sẽ không bao giờ chạy.
- **Ép `InvariantCulture`** ở đầu `Main` (`CultureInfo.DefaultThreadCurrentCulture` và culture của luồng chính). Logger ghép số vào câu SQL theo culture hiện tại; máy đặt vùng Việt Nam dùng dấu phẩy thập phân sẽ làm hỏng mọi lệnh INSERT.
- **Chỉ chạy một bản** (dùng `Mutex`). Hai bản cùng chạy sẽ ghi trùng dữ liệu và tranh nhau ghi tag.
- **Không gắn một tool vào driver hai lần** và không để hai nơi cùng ghi một tag.
- **Đặt tường minh mọi thuộc tính kết nối database** của từng tool (`ServerName`, `Port`, `UserID`, `Password`, `DatabaseName`, `TableName`, `DatabaseType`). Giá trị mặc định trong DLL khác với quy ước này.
- `iWebService.Port` và `Server` phải khớp `at-service` trong cấu hình web. Hai project chạy trên cùng một máy phải dùng hai cổng khác nhau.

## Logger dữ liệu

- `Collection` là chuỗi `Task.Tag&TênCột&IsTrigger` nối bằng `|`. `TênCột` thành tên cột trong bảng (chữ, số, gạch dưới).
- `UpdateType = Timer`: ghi một dòng mỗi `LoggingTimerRate` ms. Giá trị này viết đúng kiểu `"\"60000\""` (chuỗi có dấu nháy kép bên trong).
- Logger tự tạo bảng nếu chưa có (cột `DateTime` và mỗi tên cột một cột chuỗi). Project vẫn tạo bảng trước bằng DDL riêng để có index và để web không lỗi khi logger chưa ghi dòng nào.
- `AllowLogWhenBad = false`: tag Bad thì dòng đó không được ghi. Log không ghi thì kiểm tra trạng thái tag trước.
- Một logger = một bảng. Nhóm theo đối tượng (mỗi thiết bị, mỗi khu, toàn hệ). Tag hiển thị trên web và tag trong `Collection` phải là cùng một tag, nếu không log và màn hình lệch nhau.
- **Chu kỳ log đổi được lúc chạy**: đặt `PROJECT.logRateTag` (ví dụ `Setting.Timerate`); `MainForm` đọc tag này mỗi 3 giây và gán lại `LoggingTimerRate` cho mọi logger khi giá trị đổi (tối thiểu 1000 ms). Người vận hành sửa trên trang cài đặt, không cần build lại.

## Alarm

- `iAlarmLogger` không khai báo danh sách tag trong code: lúc chạy nó đọc bảng `alarmsettings` (xem `references/database.md`), theo dõi từng tag so với hai **tag ngưỡng**, và ghi `alarmlog`.
- `DatabaseLog.TableName = "alarmlog"`, `DatabaseSettings.TableName = "alarmsettings"`, cùng database của project.
- `EmailTagName` = tag chứa danh sách email nhận (đặt `PROJECT.emailTag`). Gửi email còn cần cấu hình máy chủ thư (`EmailConfig`); hỏi người dùng thông số SMTP khi họ muốn dùng, và nhắc mở Designer (F4) trong Visual Studio để kiểm tra component này.
- Thêm alarm = thêm dòng vào `ALARMS` của `model.js` rồi sinh lại; app tự chèn khi khởi động.

## Đọc và ghi tag trong code

`MainForm.cs` mẫu có sẵn:

```csharp
string  Read(task, tag)                    // Value dạng chuỗi; null khi chưa sẵn sàng
double  ReadNum(task, tag, fallback)       // chấp nhận cả dấu phẩy thập phân
string  Status(task, tag)                  // chất lượng; so không phân biệt hoa thường với "Good"
void    Write(task, tag, value)            // ASynWrite, chỉ ghi khi giá trị đổi
void    Write(task, tag, double, "0.0")    // định dạng số theo InvariantCulture
string  WriteNow(task, tag, value)         // SynWrite cho lệnh không được mất
void    Seed(task, tag, value, zeroIsValid)
```

Những điều rút ra từ chạy thật:

- **Chỉ ghi khi giá trị đổi** (giữ bảng "giá trị ghi lần trước"). Ghi dồn dập làm nghẽn hàng đợi ghi của ATDriver Server; driver Internal Memory xử lý khoảng 20 lệnh ghi mỗi giây trên một kênh.
- **Xoá bảng nhớ đó định kỳ** (mẫu: mỗi 90 giây). Nếu ATDriver Server khởi động lại, tag nội bộ có thể quay về giá trị cũ trong khi app vẫn tưởng mình đã ghi.
- **Nhiều tag thì ghi luân phiên**: mỗi nhịp ghi vài nhóm (ví dụ 3 thiết bị và một nhóm tổng hợp), xoay vòng; tag đổi chậm ghi thưa hơn. Riêng thay đổi trạng thái (chạy/dừng/sự cố) ghi ngay.
- **Số ghi xuống tag là chuỗi đã định dạng** (`value.ToString("0.0", InvariantCulture)`): sơ đồ SVG và ô nhập trên web hiện nguyên chuỗi, không làm tròn.
- Khi đọc số luôn đổi `,` thành `.` rồi parse theo `InvariantCulture`.
- Tag quan trọng (lệnh điều khiển) ghi bằng `SynWrite`; phần còn lại `ASynWrite`.
- Giá trị `Status` cụ thể nên được người dùng xác nhận trên thiết bị thật; so sánh không phân biệt hoa thường.

## Giá trị khởi tạo và liên kết

Tag nội bộ mới tạo đọc ra chuỗi trắng (hoặc `"0"`), không phải `null`. Lệnh ghi là bất đồng bộ và **bị bỏ qua nếu driver chưa đọc tag lần đầu**. Vì vậy `MainForm.SyncSettings` (chạy mỗi 3 giây) lặp lại việc khởi tạo cho tới khi đọc lại thấy đủ giá trị:

- `LINKS` trong `model.js`: `['Nav.Home', 'overview']` thì app ghi `#/overview` vào tag `Nav.Home`. Đây là đích của các vùng bấm trên sơ đồ SVG; không có bước này thì bấm vào sơ đồ không đi đâu.
- `DEFAULTS`: `['Meter1_Cfg.Hi_Power_P', '100']` chỉ ghi khi tag còn trống hoặc bằng 0; thêm `true` làm phần tử thứ ba khi 0 là giá trị hợp lệ (`['X.Lo_Power_P', '0', true]`). Giá trị người vận hành đã sửa không bị ghi đè.

## Logic riêng của project

Viết trong `AppTick(double dt)` của `MainForm.cs`, được gọi mỗi giây sau khi database sẵn sàng; `dt` là số giây thực đã trôi qua.

- Giá trị suy ra: tổng nhiều đồng hồ, tỉ lệ, trạng thái gộp (có máy nào sự cố) ghi vào tag nội bộ của một task tổng hợp.
- **Số tích luỹ tính theo thời gian thực**: `energy += power * dt / 3600`, không cộng một lượng cố định mỗi nhịp; nhờ vậy đổi chu kỳ hay chậm nhịp không làm sai số liệu.
- Khi khởi động, **tiếp nối số tích luỹ từ dòng cuối của bảng log** (`Db.LastRow`), không bắt đầu lại từ 0.
- Việc nặng (truy vấn tổng hợp) chạy ở luồng nền (`Task.Run`) rồi `BeginInvoke` về luồng giao diện để ghi tag; có cờ chống chạy chồng.
- Mọi khối trong timer bọc `try/catch` và hiện lỗi ở dòng trạng thái; một lỗi không được làm dừng vòng lặp.

## Mô phỏng khi chưa có thiết bị

Khi người dùng cần demo mà chưa có thiết bị: khai báo các tag đó ở kênh Internal Memory và cho app sinh số liệu.

- Mỗi thiết bị một đối tượng mô phỏng có trạng thái (0 dừng / 1 chạy / 2 sự cố) đổi theo lịch ca và ngẫu nhiên; công suất bám theo tải đặt với nhiễu nhỏ, thỉnh thoảng có đỉnh ngắn để phát sinh alarm; dòng điện, nhiệt độ suy ra từ công suất; nhiệt độ thay đổi từ từ.
- Dùng chung một bộ quy luật cho chạy thời gian thực và cho sinh lịch sử ban đầu, để số liệu hai phía khớp nhau.
- Có tag bật/tắt mô phỏng (`Setting.Sim_Enable`) và điều khiển từ web (cho phép chạy, tải đặt) để demo có tương tác.
- Lịch sử ban đầu chỉ sinh khi bảng log trống, bằng lệnh chèn gộp nhiều dòng trong một giao dịch; ghi rõ đó là dữ liệu giả.
- Không bịa thông số định mức: lấy từ người dùng. Phần nào trên giao diện chỉ là minh hoạ thì ghi chú rõ. Nếu mô phỏng ghi lên tag của thiết bị thật thì nói rõ thiết bị thật sẽ ghi đè lại.

## Tổng hợp theo ngày

Mẫu đã chạy thật cho điện năng, nước, sản lượng theo ngày và tháng:

- Tiêu thụ một ngày = chênh lệch **giá trị lớn nhất của số tích luỹ** giữa hai ngày liên tiếp. Cột log là chuỗi nên phải ép số: ``SELECT DATE(`DateTime`), MAX(`Energy`+0) FROM `datalog_x` WHERE `DateTime` >= @from GROUP BY DATE(`DateTime`) ORDER BY 1``; lấy từ trước `@from` một ngày để có mốc.
- Ghi vào bảng ngày có khoá chính là `DateTime` (0 giờ ngày đó) bằng `INSERT ... ON DUPLICATE KEY UPDATE`; bảng tháng dựng lại từ bảng ngày bằng `REPLACE INTO ... SELECT ... GROUP BY` tháng.
- Tính lại mỗi phút cho hôm nay và tháng này, rồi ghi kết quả ra tag (hôm nay, tháng này, so với cùng kỳ) để web hiện bằng thẻ.
- Hệ số quy đổi (giá điện theo khung giờ, hệ số phát thải...) để ở tag cài đặt, sửa được trên web; ghi chú rõ là giá trị do người dùng cung cấp.

## Tool khác - chỉ thêm khi người dùng yêu cầu

`iTools.dll` còn có: `iAlarmViewer`, `iAlarmStatus`, `iAlarmActions`, `iAlarmReporter`, `iDataReporter`, `iHistoricalTrend`, `iRealtimeTrend`, `iEmail`, `iSMS`, `iLogin` / `iCreateUserAccount` / `iUpdateUserAccount`, `iDateTimeWrite`, `iStatus`, `iTextBox`. `iEnergyTools.dll`: tính và log điện năng, min/avg/max, tiền điện ba giá. `iLEANTools.dll`: cộng, nhân, availability. `iWebAPI.dll`: REST API.

Các tool này chưa có mẫu khai báo trong skill. Khi dùng: kéo thả trong Designer của Visual Studio là cách chắc nhất; nếu viết code thì xem thuộc tính bằng Object Browser, viết theo cùng kiểu `tool.Driver = this.iDriver1; tool.<ThuocTinh> = ...` đặt trước dòng gán `ProjectFile`, và nói rõ với người dùng là phần đó cần kiểm tra lại.

## Build và chạy

- Build bằng MSBuild của Visual Studio (`scripts/find-atscada.ps1` in đường dẫn):
  `MSBuild.exe DesktopApp\<Ten>_App.csproj /t:Rebuild /p:Configuration=Debug /v:m`
  ATSCADA cài ở chỗ khác thì thêm `/p:ATSCADADir="..." /p:ATDriverServerDir="..."`. Build thành công có thể không in gì ngoài dòng tên file exe; kiểm tra file `bin\Debug\<Ten>_App.exe` và thư mục `bin\Debug\Drivers\` có đủ ba DLL.
- Máy không build được (không có Visual Studio hoặc không cài ATSCADA): giao source và nói rõ là chưa build thử.
- `<Ten>_App.exe --schema` chỉ tạo database và bảng rồi thoát, không cần ATDriver Server; kết quả ghi ở `schema.log` cạnh exe.
- Đổi chuỗi kết nối mà không build lại: đặt biến môi trường `ATSCADA_<TEN>_CONN` (chỉ áp dụng cho truy vấn của app; các logger vẫn dùng giá trị trong Designer).
- Form chính hiện bảng các task với số tag Good trên tổng số: dùng nó để xác nhận app đã nối được ATDriver Server.
- `iDriver` có kiểm tra bản quyền ATSCADA trên máy chạy (DLL có các mã `NO_LICENSE_KEY`, `IN_DEMO_MODE`, `DEMO_LICENSE_EXPIRED`, vượt số tag được cấp). App báo lỗi bản quyền là việc người dùng xử lý với nhà cung cấp, không phải lỗi của project.

