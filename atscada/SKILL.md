---
name: atscada
description: "Tạo, chỉnh sửa và kiểm tra dự án ATSCADA trên Windows: ATFile, TagFile, ứng dụng WinForms, MySQL, Fastweb và sơ đồ SVG. Dùng khi người dùng yêu cầu ATSCADA hoặc ngữ cảnh xác nhận rõ các công cụ của ATSCADA; xác định nền tảng trước với yêu cầu SCADA chung."
---

# ATSCADA - làm một project từ thiết bị tới web

ATSCADA là hệ SCADA chạy trên Windows. Dữ liệu đi theo một chuỗi, bước sau dùng kết quả bước trước:

```
Thiết bị ──► ATDriver Server (mở ATFile) ──► Desktop app WinForms (đọc Tag_file.XML qua iDriver)
                                                 ├─ iWebService ──► Web Fastweb (ATSCADAWebConfig.xml)
                                                 └─ iDataLogger / iAlarmLogger ──► MySQL ──► Web (báo cáo, biểu đồ lịch sử, alarm)
```

| Bước | Sản phẩm | Đọc trước khi làm |
|---|---|---|
| 1. ATFile | `ATFile_<Ten>.xml` - `Channel.Device.Tag` cho ATDriver Server | `references/atfile.md` + `references/drivers/<driver>.md` |
| 2. TagFile | `Tag_file.XML` - `Task.TagName` cho phía client | `references/tagfile.md` |
| 3. Desktop app | WinForms: driver, service cho web, logger, alarm, logic riêng | `references/desktop-app.md` |
| 4. Database | một database MySQL riêng cho project | `references/database.md` |
| 5. Web | Fastweb, cấu hình bằng `AppConfig\ATSCADAWebConfig.xml` | `references/web-config.md`, `references/web-components.md`, `references/svg.md`, `references/design.md` |
| 6. Chạy thử | thứ tự khởi động, IIS, kiểm tra | `references/deploy.md` |

Mỗi project hoàn chỉnh có đủ desktop app và web. Người dùng chỉ định driver, thiết bị, tag, chức năng; skill cho biết cách làm đúng, không tự chọn thay họ.

Mọi tài liệu cần dùng nằm trong thư mục skill này. Chỉ đọc file tham chiếu của bước đang làm, không đọc hết.

## Lệnh con

Người dùng có thể gọi skill kèm một lệnh (ví dụ `$atscada atfile`), hoặc chỉ mô tả việc cần làm; khi đó tự chọn lệnh phù hợp. Không có lệnh nào và yêu cầu là "làm project" thì chạy `new`.

| Lệnh | Việc làm | Tài liệu |
|---|---|---|
| `new` | Dựng project mới trọn chuỗi 1-6 bằng bộ công cụ sinh file | mục "Quy trình project mới" bên dưới |
| `atfile` | Viết hoặc sửa ATFile cho một hay nhiều driver | `references/atfile.md`, `references/drivers/` |
| `driver <tên>` | Tra định dạng ChannelAddress / DeviceID / địa chỉ tag của một driver, giải thích tag Bad | `references/drivers/_index.md` rồi file của driver |
| `tagfile` | Sinh `Tag_file.XML` từ ATFile, đổi tên task/tag, đặt Scale/Offset | `references/tagfile.md` |
| `desktop` | Dựng hoặc sửa desktop app: logger, alarm, service, logic, mô phỏng | `references/desktop-app.md` |
| `db` | Tạo database, bảng log, danh sách alarm, tài khoản web | `references/database.md` |
| `web` | Thêm/sửa trang, card, biểu đồ, báo cáo, alarm, bản đồ, đăng nhập | `references/web-config.md`, `references/web-components.md`, `references/design.md` |
| `svg` | Vẽ sơ đồ SVG gắn tag, xem thử bằng ảnh, gắn vào trang | `references/svg.md`, `references/design.md` |
| `check` | Kiểm tra chéo cả project: tag, bảng, cột, id SVG, liên kết trang | `node tools/gen.js --check`, `references/deploy.md` |
| `env` | Xem máy này cài gì, ở đâu (ATDriver Server, ATSCADA, Fastweb, MSBuild, Node) | `scripts/find-atscada.ps1` |

Khi người dùng chỉ cần một phần (ví dụ chỉ ATFile), làm đúng phần đó rồi dừng; không dựng cả project.

## Nguyên tắc làm việc

- **Hỏi cho đủ rồi mới viết.** Thông số driver (IP, COM, port, slave ID, vùng nhớ, topic, thứ tự word...) sai một ký tự là tag Bad, và người dùng chỉ phát hiện khi ra hiện trường. Thiếu thông tin nào thì hỏi đúng thông tin đó, không điền giá trị "có vẻ hợp lý". Giá trị mặc định của driver (timeout, chu kỳ quét) thì được dùng, nhưng nói rõ là đang dùng mặc định.
- **Đọc file driver trước khi viết chuỗi cấu hình.** Mỗi driver có số trường và ký tự phân cách riêng; sai số trường thường làm driver im lặng, không báo lỗi. `references/drivers/_index.md` để định hướng, file riêng của driver để viết.
- **Một nguồn dữ liệu, sinh ra mọi file.** Project khai báo một lần trong `tools/model.js`; ATFile, TagFile, SQL, cấu hình web, SVG và phần khai báo của desktop app đều sinh từ đó bằng `node tools/gen.js`. Sửa tay từng file sẽ làm chúng lệch nhau (tag đổi tên ở ATFile nhưng web vẫn gọi tên cũ). Project nhỏ một file thì viết tay được, nhưng vẫn theo đúng quy tắc trong file tham chiếu.
- **Kiểm tra bằng máy, không bằng mắt.** `gen.js` tự đối chiếu: tag web dùng có trong TagFile, bảng/cột có trong database, id SVG tồn tại và không trùng, liên kết trỏ tới trang có thật. Sơ đồ SVG thì render ra ảnh (`node tools/preview.js`) rồi nhìn ảnh trước khi giao.
- **Không tự bịa số liệu của người dùng.** Địa chỉ thanh ghi, ngưỡng alarm, thông số định mức, mật khẩu đều lấy từ người dùng. File mẫu trong `assets/` chỉ là mẫu cấu trúc; không giữ lại IP, địa chỉ, ngưỡng nào của ví dụ.
- **Không sửa DLL, driver, thư mục cài đặt.** Chỉ ghi trong thư mục project. Cần sửa thứ gì bên ngoài (Web.config của site đang chạy, IIS, database có dữ liệu) thì nói rõ sẽ đổi gì và hỏi trước.
- **Kết nối database:** lấy host, port, tài khoản và mật khẩu từ người dùng hoặc cấu hình dự án. Không dùng mật khẩu mẫu cho hệ thật. Đặt tường minh các giá trị cần thiết vì mặc định trong DLL có thể khác.
- **Mật khẩu khác** (broker MQTT, thiết bị, tài khoản đăng nhập web): hỏi người dùng. Không lấy lại mật khẩu thấy trong project khác trên máy.
- **Nói thật về mức kiểm chứng.** Chỉ nói "đã chạy" cho thứ đã chạy. Hệ thật chỉ kiểm chứng được trên máy có thiết bị; phần chưa thử thì ghi rõ để người dùng tự kiểm tra.
- Trả lời người dùng bằng tiếng Việt, gọn, đi thẳng vào việc.

## Máy đang làm việc

Skill không gắn với đường dẫn riêng của máy nào. Ba thứ cần tìm trên máy, đều có vị trí cài mặc định:

| Thứ cần | Vị trí mặc định | Dùng cho |
|---|---|---|
| ATDriver Server | `C:\Program Files\ATPro\ATDriverServer\` (driver trong `Drivers\`) | `ChannelDriverLocation` trong ATFile; `ATDriverBase.dll`, `ATDriverWCFInterface.dll` |
| ATSCADA (DLL tool) | `C:\Program Files\ATPro\ATSCADA\` | reference khi build desktop app; `Drivers\ATDriverClient.dll` |
| Bản web Fastweb | `<ổ đĩa>:\ATSCADA_Source\FastWeb\publish\` (bản publish mới nhất, trên máy phát triển); không có thì `C:\Program Files\ATPro\FastWeb Designer\runtime-template\` (cũ hơn) | bản web gốc để chép vào project; `tools/setup-web.js` tự tìm |

Chạy `scripts/find-atscada.ps1` (PowerShell) để biết máy có gì và ở đâu; kết quả cho luôn danh sách DLL driver đang cài. Bản web nằm ở chỗ khác thì đặt biến môi trường `ATSCADA_FASTWEB_TEMPLATE` hoặc `PROJECT.webTemplate`. Nếu ATSCADA cài ở chỗ khác, đặt `PROJECT.driverDir` trong `model.js` và truyền `/p:ATSCADADir=... /p:ATDriverServerDir=...` khi build. Nếu máy không cài ATSCADA (chỉ soạn file để mang đi), vẫn sinh được mọi file; ghi `ChannelDriverLocation` theo đường dẫn mặc định và nói rõ là chưa build, chưa chạy thử.

Công cụ: bộ sinh file cần **Node.js** (không cần cài thêm gói nào). Máy không có Node thì hỏi người dùng cho cài, hoặc viết file bằng tay theo file tham chiếu. Build desktop app cần MSBuild/Visual Studio. Xem thử SVG cần Edge hoặc Chrome. Script có tiếng Việt chạy bằng PowerShell 7 (Windows PowerShell 5 đọc UTF-8 không BOM sai).

## Bước 0 - Thu thập thông tin

Hỏi gọn trong một lượt những gì chưa có; phần người dùng đã nói thì không hỏi lại. Có bảng thanh ghi (Excel/CSV/PDF) thì xin file.

1. **Project**: tên (không dấu, không dấu cách), thư mục lưu, tên database (đề xuất `<tenproject>` viết thường và chờ họ đồng ý). Hỏi thông tin kết nối MySQL nếu chưa có.
2. **Driver và kết nối**: driver nào; sau đó mở file driver để biết phải hỏi tiếp trường gì (IP/port, COM/baud/parity, broker/user/password/topic, rack/slot...).
3. **Thiết bị**: mấy thiết bị, tên từng cái, slave/unit ID, thứ tự word, khối đọc gộp nếu thiết bị bắt đọc nguyên khối.
4. **Tag**: tên, địa chỉ, kiểu dữ liệu, chỉ đọc hay đọc/ghi, hệ số nhân, mô tả.
5. **Log và alarm**: tag nào log, chu kỳ; tag nào có alarm, ngưỡng cao/thấp, email nhận.
6. **Web**: các trang cần có và mỗi trang hiển thị gì; có sơ đồ SVG không (gồm thiết bị gì, chỗ nào hiện số, đổi màu, bấm được) và **phong cách sơ đồ** (chuẩn SCADA nền tối hoặc sáng với ký hiệu thiết bị, dashboard hiện đại, minh hoạ có hình máy và nhà máy chuyển động, hay theo chuẩn/mẫu của nhà máy; quy ước màu trạng thái); ngôn ngữ hiển thị; nền tối hay sáng; có bắt đăng nhập không; IP máy chạy desktop app.
7. **Chưa có thiết bị?** Hỏi có cần mô phỏng số liệu để demo không.

## Quy trình project mới (`new`)

1. **Chép khung.** Chép `assets/project-template/tools/` vào `<thư mục project>\tools\`. Đây là bộ sinh file đã chạy thật trên một project hoàn chỉnh:

   | File | Vai trò | Sửa? |
   |---|---|---|
   | `tools/model.js` | dữ liệu project: kết nối, kênh, thiết bị, tag, logger, alarm, liên kết, giá trị khởi tạo, bảng màu | viết lại theo project |
   | `tools/pages.js` | các trang web | viết lại theo project |
   | `tools/scenes.js` | các sơ đồ SVG | viết lại theo project |
   | `tools/gen.js` | sinh mọi file + kiểm tra chéo | giữ nguyên |
   | `tools/setup-web.js` | chép bản web Fastweb vào project, đặt `Web.config` | giữ nguyên |
   | `tools/preview.js` | render SVG ra ảnh PNG | giữ nguyên |
   | `tools/lib/*.js` | thư viện: `tags` (ATFile, TagFile), `sql`, `web` (component), `svglib` (vẽ + gắn tag), `symbols` (ký hiệu thiết bị chuẩn), `art` (hình máy có chuyển động, khối nhà máy phối cảnh), `desktop` | giữ nguyên, thêm hàm khi cần |
   | `tools/templates/DesktopApp/` | khung desktop app, chép ra một lần | giữ nguyên |

2. **Viết `model.js`** theo thông tin đã thu thập. Chuỗi `address` của kênh và `id` của thiết bị viết theo file driver. Cách khai báo từng phần nằm ngay trong chú thích của file mẫu.
3. **Chép web gốc:** `node tools/setup-web.js` tự tìm bản Fastweb trên máy, chép vào `<project>\Fastweb\` (bỏ cấu hình của project khác) và đặt chuỗi kết nối trong `Web.config`. Thứ tự tìm ở `references/web-config.md`.
4. **Viết `scenes.js` và `pages.js`** theo `references/svg.md`, `references/design.md`, `references/web-components.md`. Làm một khung mẫu, render ra ảnh, soát khoảng trống và cân đối, rồi mới nhân bản bằng vòng lặp.
5. **Sinh và kiểm tra:** `node tools/gen.js`. Sửa tới khi báo `Cross-check: no errors`. Rồi `node tools/preview.js` và mở ảnh trong `svg\preview\` để soát bố cục.
6. **Desktop app:** viết logic riêng trong `DesktopApp\MainForm.cs` (hàm `AppTick`) nếu cần, rồi build (`references/desktop-app.md`).
7. **Chạy thử** theo `references/deploy.md`, và giao kết quả.

Kết quả sau khi sinh:

```
<project>\
  ATFile_<Ten>.xml          mở bằng ATDriver Server
  Tag_file.XML              bản gốc; bản chạy nằm trong DesktopApp\
  <db>.sql                  tạo database, bảng, danh sách alarm, tài khoản web
  ATSCADAWebConfig.xml      bản gốc; tự chép vào Fastweb\AppConfig\ nếu có thư mục đó
  svg\*.svg, svg\preview\   sơ đồ nguồn và ảnh xem thử
  DesktopApp\               <Ten>_App.csproj, Program.cs, MainForm.cs, Database.cs (sửa được)
                            MainForm.Designer.cs, Loggers.g.cs, Model.g.cs (sinh lại mỗi lần, không sửa tay)
  Fastweb\                  web gốc chép về
  tools\                    bộ sinh file
```

## Những quy tắc xuyên suốt, sai là hỏng

Chi tiết nằm trong từng file tham chiếu; đây là những điểm phải nhớ dù làm phần nào.

- **Tên**: Channel, Device, Task, Tag chỉ dùng chữ không dấu, số, gạch dưới. Không dấu chấm (dấu chấm ngăn `Channel.Device.Tag` và `Task.Tag`), không dấu cách.
- **ATFile**: thuộc tính địa chỉ viết là `Addrress` (ba chữ r, đúng cách viết của chương trình). `<Tag>` được đọc theo vị trí: luôn đủ và đúng thứ tự `Name`, `Addrress`, `Type`, `ClientAccess`, `Description`. Thứ tự phần tử trong `<Channel>` cũng cố định.
- **Mọi nơi phía sau ATFile dùng tên `Task.Tag`** theo TagFile: desktop app, logger, bảng `alarmsettings`, web.
- **Ngưỡng alarm là tên tag**, không phải con số: `alarmsettings.HighLevel/LowLevel` và ngưỡng trên web đều trỏ tới tag chứa ngưỡng, nhờ đó sửa được từ web. Tag ngưỡng thường đặt ở một device Internal Memory.
- **Desktop app**: .NET Framework 4.8 (`iTools.dll` build cho 4.8, không hạ xuống được); gán `iDriver.ProjectFile` sau cùng; ép `InvariantCulture`; chỉ chạy một bản.
- **Cột log là chuỗi** (`varchar`): so sánh số trong SQL phải viết `` `cot`+0 ``.
- **Web**: mỗi phần tử bọc trong `<atscada-assembly>` riêng; `at-component-name` duy nhất cả file; `at-service` khớp `Server`/`Port` của `iWebService`; `at-connection` trùng tên một `connectionString` trong `Web.config`.
- **Phong cách sơ đồ SVG do người dùng chọn**: hỏi trước khi vẽ và ghi vào `SVG_STYLE`: `scada-dark`, `scada-light` (chuẩn SCADA, ký hiệu 2D), `dashboard` (hiện đại, có màu nhấn), `illustrated` (hình máy có bộ phận chuyển động khi chạy, khối nhà máy phối cảnh), hoặc chuẩn riêng của nhà máy. Mọi phong cách đều: chuyển động chỉ khi máy đang chạy, trạng thái có cả màu và chữ, các khung lấp đầy khung vẽ, lề và khoảng cách đều, không để mảng trống lớn.
- **SVG, luật của web**: phần tử hiện số bị ghi đè toàn bộ nội dung nên đơn vị để ở chữ tĩnh riêng; đổi màu chỉ tác động `fill`; id duy nhất trong cả trang; liên kết chuyển trang đọc đích từ giá trị tag, do desktop app ghi lúc khởi động.
- **Không `DROP`, `TRUNCATE`, `DELETE`** trên database đang có dữ liệu. Script tạo bảng dùng `CREATE ... IF NOT EXISTS`.

## Giao kết quả

Giao đúng phần người dùng yêu cầu ở lượt đó. Với mỗi file, nói ngắn gọn: nằm ở đâu, đã kiểm tra gì (parse XML, kiểm tra chéo, build, ảnh xem thử), giá trị nào đang là mặc định hoặc suy đoán, và việc người dùng cần tự làm (mở ATDriver Server xem tag Good, build trong Visual Studio, chạy file SQL, trỏ IIS vào thư mục web). Báo số channel/device/tag, số trang, số logger để họ đối chiếu với thực tế.


