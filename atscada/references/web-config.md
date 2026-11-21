# Bước 5 - Web Fastweb: cấu hình bằng `ATSCADAWebConfig.xml`

Web là một bản ASP.NET MVC đã build sẵn. Làm web cho project = chép bản web gốc về thư mục project rồi viết `AppConfig\ATSCADAWebConfig.xml`. Không sửa `bin`, `Views`, `AppScripts`, `AppTemplate` (ngoại lệ có kiểm soát ở cuối file).

Tra cứu đầy đủ từng thẻ và thuộc tính: `references/web-components.md`. Sơ đồ SVG: `references/svg.md`. Bố cục, màu, icon: `references/design.md`.

## Lấy bản web gốc

Chạy `node tools/setup-web.js`. Script tự tìm bản Fastweb, chép vào `<project>\Fastweb\` và chuẩn bị `Web.config`. Thứ tự tìm, lấy nơi đầu tiên hợp lệ:

1. Thư mục truyền trên dòng lệnh: `node tools/setup-web.js "<thư mục>"`.
2. `PROJECT.webTemplate` trong `model.js`.
3. Biến môi trường `ATSCADA_FASTWEB_TEMPLATE` (đặt một lần cho mỗi máy).
4. Thư mục `FastWeb\publish` nằm cạnh một thư mục cha của project.
5. `<ổ đĩa>:\ATSCADA_Source\FastWeb\publish` trên bất kỳ ổ nào. **Đây là bản chuẩn trên máy phát triển: bản publish của source Fastweb, build mới nhất, đủ component.**
6. `C:\Program Files\ATPro\FastWeb Designer\runtime-template\` (cài kèm FastWeb Designer; thường cũ hơn và thiếu component mới).

`node tools/setup-web.js --find` chỉ báo sẽ dùng bản nào, build ngày nào, có card v3 không. Không tìm thấy bản nào thì hỏi người dùng nơi để bản Fastweb; không tự tải từ nơi khác.

Thư mục publish là thư mục dùng chung và thường đang chứa cấu hình của project khác. Vì vậy script **không chép** `AppConfig\ATSCADAWebConfig.xml` của bản gốc, file `.pdb`, `Web.Debug.config`, `Web.Release.config`, và thay khối `<connectionStrings>` bằng đúng hai chuỗi của project này. Không ghi gì vào thư mục publish và không chạy web thẳng từ đó.

Fastweb đã có trong project thì script dừng, không ghi đè. Muốn lấy bản build mới hơn: `node tools/setup-web.js --update` (ghi đè file chương trình, giữ nguyên `Web.config` và `AppConfig`); sau đó chạy lại các tuỳ biến file web của project, nếu có.

`gen.js` tự chép `ATSCADAWebConfig.xml` vào `Fastweb\AppConfig\` mỗi lần sinh.

Các bản Fastweb không giống nhau về component. **Card v3** (`Cardv3`, so sánh với kỳ trước) có trong bản publish mới nhưng không có trong bản cài kèm FastWeb Designer; bản không có thì dùng `W.card()`. `gen.js` báo lỗi nếu trang dùng card v3 mà bản web trong project không có. Component khác: kiểm tra thư mục `Fastweb\AppScripts\Component\<Tên>\`.

## `Web.config` - chuỗi kết nối

`setup-web.js` đặt sẵn hai chuỗi trong `<connectionStrings>`, cùng trỏ vào database của project (theo `model.js`):

```xml
<add name="atscada"   connectionString="server=localhost;port=3306;uid=<project-db-user>;pwd=<project-db-password>;database=demoplant" providerName="MySql.Data.MySqlClient" />
<add name="demoplant" connectionString="server=localhost;port=3306;uid=<project-db-user>;pwd=<project-db-password>;database=demoplant" providerName="MySql.Data.MySqlClient" />
```

- Chuỗi mang tên `PROJECT.connection` là thứ `at-connection` trong XML gọi tới.
- Chuỗi tên **`atscada` bắt buộc phải có**: web ghi nhật ký thao tác ghi tag (công tắc, ô nhập) qua tên cố định này và tự tạo bảng `eventlogs`; thiếu nó thì thao tác ghi báo lỗi.

Sửa tay `Web.config` (web có sẵn, không qua script): mật khẩu có `&`, `<`, `"` phải escape XML; sửa xong site tự khởi động lại. Nếu `Web.config` thuộc một site đang chạy cho project khác, sao lưu và hỏi người dùng trước khi sửa.

## Cấu trúc file

```
atscada-app                       tiêu đề, thương hiệu, nền tối/sáng
 ├─ atscada-view  (một trang = một mục menu, hoặc trang ẩn)
 │    └─ atscada-row
 │         └─ atscada-column      (lớp lưới Bootstrap)
 │              └─ component      (card, chart, svg, báo cáo...)
 ├─ at-authentication             bảng tài khoản, có bắt đăng nhập không
 └─ at-service                    địa chỉ và cổng iWebService của desktop app
```

Luật sai là cả file không nạp được (web báo "Please check the configuration file again"):

- Mỗi phần tử con nằm trong `<atscada-components>` và **bọc trong một `<atscada-assembly at-value="...">` riêng** ghi đúng tên lớp .NET, đúng từng ký tự. Item con của component (chart-item, svg item...) thì không bọc.
- Không viết `<atscada-components />` tự đóng; luôn có thẻ mở và thẻ đóng.
- Mọi node có hai phần tử con đứng đầu: `<at-component-name>` (duy nhất trong cả file) và `<at-component-description>`.
- Giữ đúng bốn tầng view > row > column > component.

Luật sai là một phần không chạy, không báo lỗi:

- `at-location` của view: chữ thường, số, gạch nối; duy nhất. Đường dẫn trang là `#/<at-location>`.
- `at-data-tag-name` là `Task.Tag` đúng theo TagFile. Tag sai tên chỉ hiện `- - -` hoặc đứng im.
- `at-connection` phải là tên một `connectionString`; bảng và cột phải có trong database.
- `at-service` khớp `Server`/`Port` của `iWebService`. Desktop app phải đang chạy thì web mới có số liệu và mới ghi được tag.
- Thuộc tính để rỗng bị coi là thiếu và nhận giá trị mặc định của web: card v2 để rỗng `at-data-tag-status` sẽ đọc một tag giả (đặt nó bằng chính tag giá trị).
- Web chèn giá trị thuộc tính vào HTML không mã hoá: **không dùng dấu nháy kép `"` trong tiêu đề**. `&` thì được.
- Trong báo cáo, `at-alias` là tên cột thật, `at-name` là nhãn hiển thị và được đưa vào câu SQL làm bí danh: chỉ ASCII, tối đa 64 ký tự, không backtick, không trùng trong một báo cáo.
- Trong biểu đồ lịch sử, `at-content` của các đường phải khác nhau.

File được đọc lại mỗi lần tải trang: sửa XML xong chỉ cần F5.

## Viết bằng bộ sinh file

Trang khai báo trong `tools/pages.js`, bằng các hàm của `tools/lib/web.js` (gọi là `W`). Mỗi hàm trả về XML đã bọc assembly, tự đặt `at-component-name` duy nhất và escape đúng.

```js
exports.build = function (W, M) {
  const G = W.G, C = M.C;
  return [
    W.view('Overview', 'overview', 'dashboard', [          // tiêu đề, at-location, icon Material, các hàng
      W.full([W.svg('overview', scenes.overviewSvg())]),   // một hàng đầy chiều rộng
      W.full([W.card('Power (kW)', 'Meter1.Power_P', '#1d6fb8', 'fa-bolt'), /* ... */]),
    ]),
    W.view('Meter 1', 'meter-1', 'electric_meter', [/* ... */], false),   // false = trang ẩn khỏi menu
  ];
};
```

| Hàm | Component | Ghi chú |
|---|---|---|
| `W.card(title, tag, color, icon, grid, dec)` | card v2, ẩn dòng trạng thái | thẻ chỉ số gọn; `icon` là tên Font Awesome 5 như `'fa-bolt'` |
| `W.cardStatus(title, tag, statusTag, ...)` | card v2 có dòng Status | hiện chất lượng (Good/Bad) của `statusTag` |
| `W.card3(title, tag, color, icon, table, column, grid, dec, lower)` | card v3 | so với cùng thời điểm kỳ trước (hôm qua, tuần, tháng, năm); chỉ cho giá trị tức thời có log; `lower = true` khi giảm là tốt |
| `W.alarmCard(title, tag, color, icon, grid, dec, items)` | alarm card | đổi màu/nhấp nháy khi `giá trị >= ngưỡng`; `items: [{ th: 'Task.HiTag', useTag: true }]` hoặc `{ th: '80' }`; nhiều ngưỡng thì xếp tăng dần |
| `W.chart(title, unit, items, grid, type, height)` | biểu đồ thời gian thực | `type`: `line`, `bar`, `donut`, `pie`; `items: [[nhãn, 'Task.Tag', màu]]` |
| `W.hchart(title, unit, table, items, grid, type)` | biểu đồ lịch sử | `historical-line` hoặc `historical-bar`; `items: [[nhãn, cột, màu]]` |
| `W.dataReport(title, table, cols)` | báo cáo dữ liệu + Excel | nhãn cột lấy từ `COL_HEADER` trong `model.js` |
| `W.energyReport(title, table, items)` | điện năng theo giờ/ngày/tháng/năm | cột phải là **số tích luỹ**; `items: [[cột, màu]]` |
| `W.input(title, tag, grid)` | ô nhập + nút Update | sửa ngưỡng, cài đặt; không kiểm tra kiểu hay khoảng |
| `W.sw(title, tag, grid, color)` | công tắc 1/0 | |
| `W.slider(title, tag, min, max, step, grid)` | thanh trượt | |
| `W.alarmViewer(title, limit)` | bảng alarm mới nhất + xác nhận | đọc bảng `alarmlog` |
| `W.alarmReporter(title)` | báo cáo alarm theo khoảng ngày + Excel | |
| `W.map(title, height, markers)` | bản đồ (OpenStreetMap) | vị trí lấy từ tag chứa `lat;lng`; cần Internet để tải nền bản đồ |
| `W.svg(name, svgObject)` | sơ đồ SVG gắn tag | **mỗi trang tối đa một sơ đồ** |
| `W.usersView(title)` | trang quản lý tài khoản, chỉ Admin | thêm khi bật đăng nhập |
| `W.full(comps)`, `W.row(cols)`, `W.col(grid, comps)`, `W.view(...)`, `W.app(views)` | container | `W.full` = một hàng một cột đầy; component tự chia cột bằng lớp lưới của nó |

`W.G` là các lớp lưới dựng sẵn: `six` (6 thẻ mỗi hàng ở màn lớn), `four`, `three`, `two`, `one`.

Component chưa có hàm (button, time picker, camera, card v1, hyperlink view): thêm hàm vào `lib/web.js` theo đúng mẫu `comp('<Nhóm>', '<Lớp>', '<thẻ ...>' + nm('Ten') + '</thẻ>')`, lấy tên thẻ, tên lớp và thuộc tính từ `references/web-components.md`. Những component đó đánh dấu `[SRC]` trong tài liệu, nghĩa là chưa có mẫu chạy thật: báo người dùng kiểm tra trên trình duyệt.

Viết tay (project nhỏ, không dùng bộ sinh): theo khung ở mục 0.1 của `references/web-components.md`, và tự làm các kiểm tra ở cuối file này.

## Đăng nhập và phân quyền

- `PROJECT.login = true` đặt `at-required="true"`: web bắt đăng nhập bằng bảng `useraccount`. Chỉ bật khi bảng chắc chắn có tài khoản Admin (khai báo `PROJECT.users`, mật khẩu do người dùng đưa).
- Khi `at-required="false"`, mọi trang và component đều hiện, bất kể `at-roles`.
- `at-roles` có ở mọi tầng. Trang chỉ cho Admin: truyền `{ roles: 'Admin' }` cho `W.view` và đặt vai trò Admin cho cả hàng, cột, component bên trong (như `W.usersView`).
- Ẩn trang không phải là chặn ghi tag. Muốn Operator không sửa được cài đặt thì đặt `at-roles="Admin"` cho từng component ghi hoặc cho cả trang cài đặt. Hỏi người dùng muốn mức nào.
- Mật khẩu mới tạo trên trang quản lý tài khoản phải từ 8 ký tự và có ít nhất 3 trong 4 loại (hoa, thường, số, ký tự đặc biệt); nên đặt tài khoản mặc định theo quy tắc đó.

## Những điều web không làm, nên xử lý ở chỗ khác

- Không có menu nhiều cấp: mỗi trang hiện là một mục phẳng, theo thứ tự trong XML. Trang nhiều thì ẩn trang chi tiết và mở từ sơ đồ.
- Số trên SVG và ô nhập không được làm tròn: desktop app ghi chuỗi đã định dạng (`"12.5"`) vào tag, hoặc dùng kiểu dữ liệu/Scale phù hợp. Card thì có `at-decimal-places`.
- Biểu đồ lịch sử mở ra mặc định xem từ 0 giờ hôm nay tới hiện tại. Bảng tổng hợp theo ngày/tháng vì vậy mở ra chỉ thấy một điểm; ghi chú trong tiêu đề để người dùng chọn khoảng ngày, hoặc xem ngoại lệ bên dưới.
- Alarm card chỉ so `>=`. Cảnh báo mức thấp trên trang thì dùng phần tử alarm của SVG (có cả cao và thấp) hoặc để bảng alarm lo.
- Nội dung ngoài (font, script, CSS từ CDN) bị chặn bởi chính sách bảo mật của site; ảnh ngoài chỉ qua https.

## Ngoại lệ: sửa file của bản web

Chỉ khi người dùng yêu cầu một hành vi mà cấu hình không làm được, và phải nói rõ sẽ sửa file nào. Làm bằng script chạy lại được nhiều lần (tìm mốc, chèn nếu chưa có, báo lỗi nếu không thấy mốc), giữ trong `tools\`, vì chép bản Fastweb mới sẽ mất chỗ sửa. Hai tuỳ biến đã dùng thật trong project mẫu:

- `Content\Site.css`: thêm khoảng cách dưới cho mọi component (`display:block; margin-bottom:20px`) và bo góc khung SVG (`atscada-svg > div { border-radius:14px; overflow:hidden }`).
- `AppScripts\Component\HistoricalChart\atscada-historical-chart-view.js`: sau dòng `this.dateRangePicker.initialize();` đặt khoảng ngày mặc định 30 ngày cho bảng tên kết thúc `_daily`, 400 ngày cho `_monthly`.

## Kiểm tra trước khi giao

`node tools/gen.js` làm sẵn: parse, `at-component-name` và `at-location` không trùng, mọi tag có trong TagFile, mọi bảng/cột có trong database, id SVG tồn tại và không trùng, liên kết SVG có đích. Tự kiểm thêm:

- `PROJECT.connection` có trong `Web.config`, và chuỗi `atscada` còn đó.
- `at-service` đúng máy và cổng của desktop app.
- Mở từng trang trên trình duyệt nếu chạy được; phần chưa xem được thì nói rõ.

