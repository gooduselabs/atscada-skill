# ATSCADA Fastweb - tham chiếu component cho `AppConfig\ATSCADAWebConfig.xml`

Tài liệu này lập từ mã nguồn C# của Fastweb (hợp đồng XML, giá trị mặc định, cách render), mã JS chạy trên trình duyệt, và cấu hình của một project hoàn chỉnh đã chạy thật (gọi tắt là **project mẫu**, 35 trang, hơn 1200 component).

Mục lục: 0 luật chung của file XML · A gốc và container (app, authentication, service, view, row, column, menu, icon, roles) · B từng component · C chi tiết SVG · D mẫu báo cáo Excel và Web.config · E bản gốc và tuỳ biến · các điểm chưa xác nhận

Quy ước nhãn trong tài liệu:
- **[ES]** = có dùng trong config project mẫu (đã chạy thật). **[SRC]** = chỉ biết từ mã nguồn, chưa thấy trong config thật.
- "Mặc định C#" = giá trị khi thiếu thuộc tính trong XML. "Mặc định JS" = giá trị JS dùng khi thuộc tính HTML rỗng.
- Tên type và tên thuộc tính XML đã được đối chiếu giữa DLL đang triển khai của project mẫu và DLL build từ mã nguồn: 295 thuộc tính/phần tử, giống hệt nhau.

---

## 0. Luật chung của file XML (đọc trước)

### 0.1 Khung và cách bọc component

```xml
<?xml version="1.0" encoding="utf-8"?>
<atscada-app xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" at-roles="Admin, Operator" at-title="..." at-brand="ATSCADA" at-author="..." at-dark-mode="true">
  <at-component-name>project mẫu</at-component-name>
  <at-component-description>...</at-component-description>
  <atscada-components>
    <atscada-assembly at-value="ATSCADAWebApp.Core.ATSCADAView, ATSCADAFastWeb.Core, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null">
      <atscada-view ...>
        <at-component-name>View_49</at-component-name>
        <at-component-description>View</at-component-description>
        <atscada-components>
          <atscada-assembly at-value="ATSCADAWebApp.Core.ATSCADARow, ATSCADAFastWeb.Core, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null">
            <atscada-row at-roles="Admin, Operator">
              <at-component-name>Row_3</at-component-name><at-component-description>Row</at-component-description>
              <atscada-components>
                <atscada-assembly at-value="ATSCADAWebApp.Core.ATSCADAColumn, ATSCADAFastWeb.Core, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null">
                  <atscada-column at-roles="Admin, Operator" at-grid-column="col-sm-12">
                    <at-component-name>Col_2</at-component-name><at-component-description>Col</at-component-description>
                    <atscada-components>
                      <atscada-assembly at-value="ATSCADAWebApp.Component.Cardv2.ATSCADACardv2, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null">
                        <atscada-cardv2 ...><at-component-name>Card_7</at-component-name><at-component-description>Card</at-component-description></atscada-cardv2>
                      </atscada-assembly>
                    </atscada-components>
                  </atscada-column>
                </atscada-assembly>
              </atscada-components>
            </atscada-row>
          </atscada-assembly>
        </atscada-components>
      </atscada-view>
    </atscada-assembly>
  </atscada-components>
  <at-authentication at-connection="energysystem" at-table-name="useraccount" at-required="true"></at-authentication>
  <at-service at-address="localhost" at-port="9266"></at-service>
</atscada-app>
```

- Thứ tự phần tử con đã chứng minh [ES]: trong `atscada-app`: `at-component-name`, `at-component-description`, `atscada-components`, `at-authentication`, `at-service`. Trong mọi node: `at-component-name`, `at-component-description` rồi mới tới `atscada-components` (composite) hoặc các item con (component).
- Mỗi con của `atscada-components` **phải** là `<atscada-assembly at-value="<AssemblyQualifiedName>">` chứa **đúng một** phần tử gốc của type đó. `CollectionSerializer.ReadXml` gọi `Type.GetType(at-value)`; nếu chuỗi sai (type = null) thì reader lệch và cả file không nạp được -> web trả HTTP 501 "Please check the configuration file again" (suy ra từ mã: `Deserialize()` nuốt exception, trả null).
- **Không viết `<atscada-components />` tự đóng**; luôn viết `<atscada-components></atscada-components>` (ReadXml gọi `ReadStartElement` rồi `ReadEndElement`; thẻ tự đóng sẽ làm nó nuốt nhầm thẻ đóng của cha - suy ra từ mã, chưa thử). Item lá tự đóng (`<atscada-chart-item ... />`) thì được [ES].
- `at-component-name` / `at-component-description` là **phần tử con**, không phải thuộc tính (`[XmlElement]` trong `ComponentBase`). Mặc định C#: name `NewComponent` (từng lớp đặt lại: `NewCard`, `NewView`...), description `ATSCADA Fast Web Component`. Runtime web không dùng hai giá trị này để hiển thị (chỉ description của app được đưa vào `<meta name="description">`). Generator project mẫu đặt `<Prefix>_<số thứ tự>` duy nhất.
- `at-roles` là thuộc tính có ở **mọi** node kế thừa `ComponentBase` (app, view, row, column, component). Mặc định C#: `Admin, Operator`.
- Kiểu `bool` trong XML (XmlSerializer): `true`/`false` chữ thường (hoặc `1`/`0`). Kiểu `decimal`/`double`: dấu chấm thập phân.
- File được **đọc lại mỗi lần tải trang `Home/Index` hoặc `Home/Login`** (`LoadApplication(true)`): sửa XML xong chỉ cần F5, không cần restart IIS.
- Cấu trúc đã chứng minh: App -> View -> Row -> Column -> Component. Mã `Render()` của View/Row/Column chỉ lặp qua con và gọi `Render()` nên về kỹ thuật con nào cũng được, nhưng Site.css bản gốc có ghi chú rằng `.row` nằm trực tiếp trong `.row` làm lệch lề. Giữ đúng 4 tầng.

### 0.2 HTML sinh ra và hệ quả

- `atscada-row` -> `<div class="row">…</div>`; `atscada-column` -> `<div class="{at-grid-column}"><div class="row">…</div></div>`; mỗi component -> `<div class="{at-grid-column}"><atscada-xxx …></atscada-xxx></div>`. Tức là `at-grid-column` của component tính trên lưới 12 cột **bên trong** column chứa nó. CSS là Bootstrap v5.2.0 (`AppTemplate\css\material\app.min.css`): dùng được `col-12`, `col-sm-*`, `col-md-*`, `col-lg-*`, `col-xl-*`, `col-xxl-*`, ghép nhiều lớp cách nhau bằng dấu cách. [ES] dùng: `col-sm-12`, `col-xl-6 col-12`, `col-xl-4 col-sm-6 col-12`, `col-xl-3 col-sm-6 col-12`, `col-xl-2 col-lg-4 col-sm-6 col-12`, `col-xl-2 col-sm-4 col-12`.
- `Render()` C# **không HtmlEncode** giá trị thuộc tính (ghép chuỗi thẳng `at-content="{Content}"`). Vì vậy trong `at-content`, `at-data-tag-name`... **không dùng dấu nháy kép `"`** (sau khi XML giải mã `&quot;` thành `"` sẽ phá vỡ HTML). `&amp;` trong XML thành `&` thì ổn. Ngoại lệ có chủ ý: `at-content` của `atscada-svg` là markup SVG được chèn nguyên văn.
- JS đọc thuộc tính theo mẫu `getAttribute('x') || mặc_định`: **chuỗi rỗng bị coi là thiếu và rơi về mặc định JS**. Ví dụ `at-xlabel=""` của chart realtime vẫn hiện nhãn `Time`; `at-data-tag-status=""` của Cardv2 thành tag giả `TaskName.TagStatus`.
- Tên tag luôn là `TaskName.TagName` (server chấp nhận 1-128 ký tự, không ký tự điều khiển, không `<` `>`; tối đa 5000 tag mỗi lần đọc).
- Mỗi view render trong một `<atscada-task at-interval at-max-number-of-write at-timeout>`; mọi component trong view dùng chung một vòng đọc: mỗi `at-interval` ms gửi `POST /Data/Read` một lần với toàn bộ tag của view, trả về `{Name, Value(string), Status, TimeStamp}`. `Status` là chuỗi; mã JS chỉ so với `'Good'` (và server tự trả `Bad` cho tên tag không hợp lệ). Giá trị là **chuỗi**.

### 0.3 Chuỗi assembly (chính xác từng ký tự)

Hậu tố chung: `, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null`

| Thẻ XML gốc | `at-value` | Chứng cứ |
|---|---|---|
| `atscada-view` | `ATSCADAWebApp.Core.ATSCADAView, ATSCADAFastWeb.Core, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-hyperlink-view` | `ATSCADAWebApp.Core.ATSCADAHyperlinkView, ATSCADAFastWeb.Core, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [SRC] suy từ namespace+class |
| `atscada-row` | `ATSCADAWebApp.Core.ATSCADARow, ATSCADAFastWeb.Core, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-column` | `ATSCADAWebApp.Core.ATSCADAColumn, ATSCADAFastWeb.Core, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-card` | `ATSCADAWebApp.Component.Card.ATSCADACard, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [SRC] |
| `atscada-cardv2` | `ATSCADAWebApp.Component.Cardv2.ATSCADACardv2, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-cardv3` | `ATSCADAWebApp.Component.Cardv3.ATSCADACardv3, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-alarm-card` | `ATSCADAWebApp.Component.AlarmCard.ATSCADAAlarmCard, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-chart` | `ATSCADAWebApp.Component.Chart.ATSCADAChart, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-button` | `ATSCADAWebApp.Component.Button.ATSCADAButton, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [SRC] |
| `atscada-switch` | `ATSCADAWebApp.Component.Switch.ATSCADASwitch, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-attribute` (Input) | `ATSCADAWebApp.Component.Input.ATSCADAInput, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-slider` | `ATSCADAWebApp.Component.Slider.ATSCADASlider, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-time-picker` | `ATSCADAWebApp.Component.TimePicker.ATSCADATimePicker, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [SRC] |
| `atscada-alarm-viewer` | `ATSCADAWebApp.Component.AlarmViewer.ATSCADAAlarmViewer, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-alarm-reporter` | `ATSCADAWebApp.Component.AlarmReporter.ATSCADAAlarmReporter, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-data-reporter` | `ATSCADAWebApp.Component.DataReporter.ATSCADADataReporter, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-historical-chart` | `ATSCADAWebApp.Component.HistoricalChart.ATSCADAHistoricalChart, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-energy-reporter` | `ATSCADAWebApp.Component.EnergyReporter.ATSCADAEnergyReporter, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-svg` | `ATSCADAWebApp.Component.SVG.ATSCADASVG, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-user` | `ATSCADAWebApp.Component.User.ATSCADAUser, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-google-map` | `ATSCADAWebApp.Component.GoogleMap.ATSCADAGoogleMap, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [ES] |
| `atscada-stream-camera` | `ATSCADAWebApp.Component.StreamCamera.ATSCADAStreamCamera, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null` | [SRC] |

Lưu ý tên: namespace là `ATSCADAWebApp.*` nhưng tên assembly là `ATSCADAFastWeb.Core` / `ATSCADAFastWeb.Component`. Item con (chart-item, svg item...) **không** bọc `atscada-assembly`.

Không có component nào khác trong assembly (đã liệt kê hết các lớp `IComponent`). Nhánh `ATSCADAWebApp.Core.Element.*` (`atscada-root-view`...) là thế hệ cấu hình cũ, không nạp qua `atscada-assembly` - bỏ qua.

---

## A. Gốc và container

### A.1 `atscada-app` [ES] - phần tử gốc, không bọc assembly

| Thuộc tính | Ý nghĩa | Giá trị | Mặc định C# |
|---|---|---|---|
| `at-title` | `<title>` của trang | chuỗi | `ATSCADA` |
| `at-brand` | chữ trên thanh header (`.navbar-brand`, gán bằng `innerHTML`) | chuỗi/HTML | `ATSCADA` |
| `at-author` | `<meta name="author">` | chuỗi | `ATSCADA LAB` |
| `at-dark-mode` | `true` -> thêm class `dark-mode` vào `<html>` lúc tải trang. Người dùng đổi được bằng mục "Light mode / Dark mode" trong menu người dùng trên header; lựa chọn **không được lưu** (F5 quay về giá trị XML) | `true`/`false` | `true` |
| `at-roles` | có trong XML nhưng không được kiểm tra ở cấp app | chuỗi | `Admin, Operator` |

Phần tử con: `at-component-name` (mặc định `NewApplication`), `at-component-description` (mặc định `DIGITAL TRANSFORMATION`; đưa vào `<meta name="description">`), `atscada-components` (chứa các view), `at-authentication`, `at-service`.

Ví dụ thật: xem mục 0.1.

### A.2 `at-authentication` [ES] (XmlType `atscada-app-authentication`, nhưng tên phần tử trong XML là `at-authentication`)

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-connection` | **tên** connection string trong `Web.config` chứa bảng tài khoản. Cũng là connection mà API quản lý user (`atscada-user`) dùng | `atscada` |
| `at-table-name` | bảng tài khoản, cột bắt buộc `UserName`, `Password`, `Role`. Login: `select Role from <bảng> where UserName=@u and Password=@p`, mật khẩu = MD5 của chuỗi ASCII, hex **chữ hoa** 32 ký tự | `useraccount` |
| `at-required` | `true`: phải đăng nhập (`/Home/Login`), kiểm tra role. `false`: vào thẳng, **mọi view/component đều hiện bất kể `at-roles`**, tên hiển thị `admin`, không hiện nút Logout, các API không đòi phiên | `true` |

Lưu ý: component `atscada-user` (API `UserController`) luôn thao tác bảng tên cố định `useraccount` trên connection `at-connection` (không theo `at-table-name`) và tự tạo bảng nếu thiếu: `UserName VARCHAR(100) PK, Password VARCHAR(100), Role VARCHAR(50)`. Đăng nhập sai nhiều lần bị khóa theo IP 15 phút (`LoginRateLimiter`).

Ví dụ thật: `<at-authentication at-connection="energysystem" at-table-name="useraccount" at-required="true"></at-authentication>`

### A.3 `at-service` [ES] (XmlType `atscada-app-service`)

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-address` | host của iWebService (WCF) | `localhost` |
| `at-port` | cổng của iWebService (kiểu chuỗi) | `8010` |

Server web nối `net.tcp://{at-address}:{at-port}/ATSCADAService` (`ServiceClient.Start`). Đây là nơi duy nhất khai địa chỉ/cổng dịch vụ tag; **không** nằm trong Web.config. Cổng phải khớp cổng iWebService của ứng dụng desktop (project mẫu: 9266).

Ví dụ thật: `<at-service at-address="localhost" at-port="9266"></at-service>`

### A.4 `atscada-view` [ES]

| Thuộc tính | Ý nghĩa | Giá trị | Mặc định C# |
|---|---|---|---|
| `at-content` | chữ trên menu trái (gán `innerHTML`) | chuỗi | `Home` |
| `at-location` | khóa định tuyến: URL là `…/#/<at-location>`; server tìm view bằng so sánh chuỗi **chính xác** | nên dùng `a-z0-9-`, duy nhất | `home` |
| `at-icon` | icon menu - **tên ligature Material Icons** (xem A.8) | vd `dashboard` | `home` |
| `at-roles` | role được thấy view | danh sách cách nhau dấu phẩy | `Admin, Operator` |
| `at-visible` | `false` -> **không có mục menu**, nhưng view vẫn mở được qua `#/<at-location>` (dùng cho trang chi tiết mở từ hyperlink SVG / marker bản đồ) | `true`/`false` | `true` |
| `at-interval` | chu kỳ đọc tag của view (ms) | số | `1000` |
| `at-timeout` | timeout mỗi request đọc/ghi tag (ms) | số | `3000` |
| `at-max-number-of-write` | số chu kỳ tối đa thử lại một lệnh ghi. Mỗi chu kỳ gửi `Data/Write`; lệnh coi là xong khi kết quả trả về có `Value` đúng bằng giá trị ghi và `Status='Good'`, hoặc khi hết số lần | số | `10` |

Hành vi:
- View không có con -> render `&nbsp;` (trang trống).
- View đầu tiên trong XML mà người dùng có quyền là trang mặc định khi URL không có hash (ưu tiên: hash hiện tại -> `history.state.lastLocation` -> view đầu tiên của menu -> `home`).
- Location không tồn tại/không có quyền -> hiện nút đỏ "Not found! Click here to go back".
- Rời view: vòng đọc tag dừng, component bị hủy.

Ví dụ thật:
```xml
<atscada-view at-roles="Admin, Operator" at-content="Complex overview" at-location="overview" at-icon="dashboard" at-interval="1000" at-max-number-of-write="10" at-timeout="3000" at-visible="true">
<atscada-view at-roles="Admin, Operator" at-content="Plastics Plant · Injection 350T-1" at-location="machine-f1m01" at-icon="memory" at-interval="1000" at-max-number-of-write="10" at-timeout="3000" at-visible="false">
<atscada-view at-roles="Admin" at-content="Users" at-location="users" at-icon="manage_accounts" at-interval="1000" at-max-number-of-write="10" at-timeout="3000" at-visible="true">
```

### A.5 `atscada-hyperlink-view` [SRC] - mục menu chuyển hướng ra URL ngoài

Là lớp cấp View (không chứa con, **không có** `atscada-components`). Thuộc tính: `at-content` (`Home`), `at-location` (`home`), `at-icon` (`home`), `at-roles` (`Admin, Operator`), `at-visible` (`true`), `at-link` (URL đích, mặc định `http://atscada.com`), `at-delay` (giây đếm ngược trước khi chuyển, mặc định `3`; `<= 0` chuyển ngay). Render `<atscada-redirect at-link at-visible at-delay>`: hiện "Redirection to … in N seconds" rồi `window.location.replace(link)`. Chưa thấy trong config thật - chưa kiểm chứng chạy.

### A.6 `atscada-row` [ES]

Chỉ có `at-roles` (mặc định `Admin, Operator`) + `at-component-name` (mặc định `NewRow`) + `atscada-components`. Không con -> `&nbsp;`.
Ví dụ thật: `<atscada-row at-roles="Admin, Operator"><at-component-name>Row_3</at-component-name><at-component-description>Row</at-component-description><atscada-components>…</atscada-components></atscada-row>`

### A.7 `atscada-column` [ES]

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-grid-column` | lớp Bootstrap của cột | `col-sm-12` |
| `at-roles` | như trên | `Admin, Operator` |

Ví dụ thật: `<atscada-column at-roles="Admin, Operator" at-grid-column="col-sm-12">`. project mẫu luôn dùng 1 row = 1 column `col-sm-12`, chia cột bằng `at-grid-column` của từng component.

### A.8 Menu và icon

- Menu trái: mỗi view (có quyền, `at-visible` khác `false`) là một mục phẳng, theo thứ tự trong XML. **Không có nhóm/submenu** (template mục menu chỉ có icon + text; không có mã lồng cấp). Không có thuộc tính sắp xếp.
- **Icon của view = Material Icons** (font `AppTemplate\css\material\icon\iconfont\MaterialIcons-Regular.ttf`, nạp bằng `material-icons.css`; chỉ có class `.material-icons` tức bộ **filled/Regular**). Mã: `<i class="material-icons">{at-icon}</i>` -> `at-icon` là **tên ligature chữ thường có gạch dưới**, vd `dashboard`, `bolt`, `eco`, `timeline`, `description`, `notifications`, `settings`, `manage_accounts`, `memory`, `precision_manufacturing`, `settings_suggest` (tất cả [ES]). Danh sách gợi ý trong `MaterialIconHelper.cs`: home dashboard settings display_settings tune build info help list view_list grid_view apps storage memory developer_board power power_settings_new speed thermostat sensors bolt offline_bolt opacity water_damage electrical_services toggle_on toggle_off analytics show_chart bar_chart pie_chart timeline equalizer multiline_chart scatter_plot table_chart insert_chart assessment trending_up trending_down alarm alarm_on notifications notifications_active warning error report router device_hub computer desktop_windows tv cloud cloud_upload cloud_download wifi wifi_off map place my_location videocam camera_alt lock vpn_key security person group account_circle manage_accounts refresh sync swap_horiz check_circle cancel layers description folder schedule history email.
- **Icon của card (Card, Cardv2, Cardv3, AlarmCard) = Font Awesome Free 5.15.3** (trong `AppTemplate\css\vendor.min.css`, font ở `AppTemplate\webfonts\fa-solid-900.*`, `fa-regular-400.*`, `fa-brands-400.*`). Mã: `iconElement.classList = at-icon` -> `at-icon` là **chuỗi class đầy đủ**, vd `fa fa-bolt fa-fw` (`fa` = solid; cũng dùng được `fas`, `far`, `fab`). Tên icon phải thuộc FA **5** (vd `fa-tachometer-alt`, `fa-thermometer-half`, `fa-exclamation-triangle`, không phải tên FA6 như `fa-gauge`). [ES] dùng: bolt tachometer-alt wave-square percentage thermometer-half leaf wind cogs calendar-day award solar-panel plug industry cubes water vial users tree exclamation-triangle coins charging-station balance-scale arrows-alt-v. Gợi ý trong `FontAwesomeIconHelper.cs` (dạng `fa fa-{name} fa-fw`): bolt plug car-battery battery-full battery-half battery-empty solar-panel power-off charging-station lightbulb water fan burn fire fire-extinguisher gas-pump oil-can faucet smog tachometer-alt thermometer-full thermometer-half thermometer-empty temperature-high temperature-low compass balance-scale stopwatch clock flask atom microscope industry building broadcast-tower microchip memory hdd robot truck cog cogs wrench screwdriver hammer chart-bar chart-line chart-pie chart-area database server network-wired wifi signal ethernet cloud globe bell bell-slash exclamation-triangle exclamation-circle info-circle check-circle times-circle shield-alt lock lock-open key eye eye-slash desktop laptop mobile-alt sliders-h filter search sync redo undo camera video user users home th list.

### A.9 Ngữ nghĩa `at-roles`

- Role của người dùng lấy từ cột `Role` của bảng tài khoản. Trang quản lý user chỉ cho chọn `Admin` hoặc `Operator`; API quản lý user đòi role `Admin`.
- **View**: lọc trong `RootRepository.GetViews` - tách theo dấu phẩy, `Trim`, so khớp **phân biệt hoa thường** (`Array.IndexOf`). View không có quyền: không lên menu và `Routing/GetView` trả rỗng.
- **Row / Column / Component**: `ComponentBase.IsAllowed` - tách dấu phẩy, `Trim`, so **không phân biệt hoa thường**; không được phép thì bị bỏ khỏi HTML (server-side).
- `at-roles` rỗng -> không ai thấy (khi `at-required="true"`). Khi `at-required="false"` mọi thứ đều hiện.
- Ví dụ thật: view `Users` và component `atscada-user` đặt `at-roles="Admin"`.

---

## B. Component

Mọi component đều có thêm `at-roles` và 2 phần tử con `at-component-name`, `at-component-description` (không lặp lại bên dưới). Mọi component đều có `at-grid-column`.

### B.1 `atscada-card` - Card [SRC] (không dùng trong project mẫu)

HTML element: `<atscada-card>`.

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-content` | tiêu đề | `Name` |
| `at-data-tag-name` | tag giá trị | `TaskName.TagName` |
| `at-color` | màu nền card (CSS color) | `#008080` |
| `at-icon` | class Font Awesome 5 | `fa fa-globe fa-fw` |
| `at-decimal-places` | số chữ số thập phân | `2` |
| `at-data-tag-status` | tag lấy **chất lượng** để hiện dòng "Status: …". Rỗng hoặc `TaskName.TagStatus` -> dùng chính tag giá trị | `` (rỗng) |
| `at-hidden-status` | `true` ẩn dòng Status (visibility hidden, vẫn chiếm chỗ) | `false` |
| `at-grid-column` | | `col-sm-3` |

Hiển thị: như Cardv2 (mục B.2). Ví dụ (dựng từ nguồn, chưa chạy thật):
```xml
<atscada-assembly at-value="ATSCADAWebApp.Component.Card.ATSCADACard, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null"><atscada-card at-roles="Admin, Operator" at-content="Power (kW)" at-data-tag-name="Plant.Total_Power" at-color="#008080" at-icon="fa fa-bolt fa-fw" at-decimal-places="1" at-data-tag-status="" at-hidden-status="false" at-grid-column="col-sm-3"><at-component-name>Card_1</at-component-name><at-component-description>Card</at-component-description></atscada-card></atscada-assembly>
```

### B.2 `atscada-cardv2` - Card v2 [ES]

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-content` | tiêu đề | `Name` |
| `at-data-tag-name` | tag giá trị | `TaskName.TagName` |
| `at-data-tag-status` | tag lấy chất lượng cho dòng Status. **Không được để rỗng**: rỗng -> JS dùng `TaskName.TagStatus` và thêm tag giả đó vào danh sách đọc. Cách dùng đã chứng minh: đặt bằng chính tag giá trị | `TaskName.TagStatus` |
| `at-color` | màu nền | `#008080` |
| `at-icon` | class FA5 | `fa fa-globe fa-fw` |
| `at-decimal-places` | số thập phân | `2` |
| `at-hidden-status` | `true` ẩn dòng Status | `false` |
| `at-grid-column` | | `col-sm-3` |

Hành vi (Card/Cardv2/Cardv3 giống nhau):
- Số: nếu chuỗi giá trị là số -> `toFixed(at-decimal-places)` + **dấu phẩy ngăn nghìn, dấu chấm thập phân** (`1,234.5`). Không phải số -> hiện nguyên chuỗi. `null`/rỗng -> `- - -`.
- Dòng mô tả: `Status: <status của tag status>` (vd `Good`/`Bad`), cập nhật khi status đổi. Giá trị **không** bị che khi Bad - card vẫn hiện giá trị cuối server trả.
- Màu nền cố định theo `at-color` (muốn đổi màu theo ngưỡng dùng AlarmCard).

Ví dụ thật:
```xml
<atscada-cardv2 at-roles="Admin, Operator" at-content="Grid (kW)" at-data-tag-name="Util.Grid_Power" at-data-tag-status="Util.Grid_Power" at-color="#6d4fc4" at-icon="fa fa-plug fa-fw" at-decimal-places="1" at-hidden-status="true" at-grid-column="col-xl-2 col-lg-4 col-sm-6 col-12"><at-component-name>Card_…</at-component-name><at-component-description>Card</at-component-description></atscada-cardv2>
```

### B.3 `atscada-cardv3` - Card v3 = Cardv2 + so sánh với kỳ trước [ES]

Có đủ 8 thuộc tính của Cardv2, thêm:

| Thuộc tính | Ý nghĩa | Giá trị | Mặc định C# |
|---|---|---|---|
| `at-compare-connection` | tên connection string | | `atscada` |
| `at-compare-table` | bảng log (có cột `DateTime`). **Rỗng (hoặc cột rỗng) -> không vẽ phần so sánh**, card chạy như Cardv2 | | `` |
| `at-compare-column` | cột trong bảng | | `` |
| `at-compare-period` | kỳ mặc định | `yesterday` \| `week` \| `month` \| `year` \| `custom` (giá trị lạ -> `yesterday`) | `yesterday` |
| `at-compare-allow-pick` | cho người dùng đổi kỳ / chọn ngày (`custom` chỉ có khi `true`) | `true`/`false` | `true` |
| `at-compare-lower-is-better` | `true`: giảm là tốt (mũi tên xuống màu "good") | `true`/`false` | `false` |
| `at-compare-percent` | `ratio` = hiện tại/kỳ trước×100; `change` = \|hiện tại−kỳ trước\|/kỳ trước×100 | `ratio` \| `change` | `ratio` |

Hành vi: gọi `POST /HistoricalChart/Compare` (60 s một lần, timeout 8 s). Server lấy **dòng cuối có `DateTime <= (bây giờ lùi 1 ngày / 7 ngày / 1 tháng / 1 năm, hoặc ngày chọn + giờ hiện tại)`** của cột đó. Hiện giá trị kỳ trước (định dạng `en-US` theo `at-decimal-places`), mũi tên lên/xuống và phần trăm 1 chữ số thập phân. Chỉ hợp cho giá trị tức thời có được log. Nhãn chọn kỳ: Yesterday / Last week / Last month / Last year / Pick date.

Ví dụ thật:
```xml
<atscada-cardv3 at-roles="Admin, Operator" at-content="Plastics power (kW)" at-data-tag-name="F1.Power" at-data-tag-status="F1.Power" at-color="#1d6fb8" at-icon="fa fa-industry fa-fw" at-decimal-places="1" at-hidden-status="true" at-grid-column="col-xl-3 col-sm-6 col-12" at-compare-connection="energysystem" at-compare-table="datalog_plant" at-compare-column="F1_Power" at-compare-period="yesterday" at-compare-allow-pick="true" at-compare-lower-is-better="true" at-compare-percent="change">
```

### B.4 `atscada-alarm-card` - Alarm Card [ES]

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-content` | tiêu đề | `Name` |
| `at-data-tag-name` | tag giá trị hiển thị | `TaskName.TagName` |
| `at-color` | màu nền bình thường | `#008080` |
| `at-icon` | class FA5 | `fa fa-globe fa-fw` |
| `at-decimal-places` | số thập phân | `2` |
| `at-grid-column` | | `col-sm-3` |

Không có `at-hidden-status`/`at-data-tag-status`: dòng Status luôn hiện theo chất lượng của tag giá trị.

Item con `atscada-alarm-card-item` (0..n, tự đóng được):

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-name` | tên item (chỉ để quản lý; không render) | `Name` |
| `at-content` | **ngưỡng**: hằng số, hoặc **tên tag** nếu `at-use-tag="true"` | `Value` |
| `at-data-tag-name` | tag đem so với ngưỡng (thường = tag của card; rỗng -> dùng tag của card) | `TaskName.TagName` |
| `at-color` | màu khi kích hoạt | `#008080` |
| `at-blink` | `true`: nháy 500 ms giữa màu cảnh báo và màu gốc; `false`: giữ màu cảnh báo | `false` |
| `at-use-tag` | `true`: `at-content` là tên tag ngưỡng | `false` |

Quy tắc: item kích hoạt khi **`giá trị >= ngưỡng`** (cả hai là số); nếu một bên không phải số thì so chuỗi bằng nhau. Chỉ có chiều ">=" - không có "<=". Nhiều item cùng kích hoạt: **item đứng sau cùng trong XML thắng** -> xếp ngưỡng tăng dần. Mẹo đã dùng: ngưỡng `0` + `at-blink="false"` để đổi màu khi giá trị không âm.

Ví dụ thật:
```xml
<atscada-alarm-card at-roles="Admin, Operator" at-content="Total power (kW)" at-data-tag-name="Plant.Total_Power" at-color="#1d6fb8" at-icon="fa fa-bolt fa-fw" at-decimal-places="1" at-grid-column="col-xl-2 col-lg-4 col-sm-6 col-12"><at-component-name>AlarmCard_…</at-component-name><at-component-description>AlarmCard</at-component-description><atscada-alarm-card-item at-name="A14" at-content="Plant.Hi_Power" at-data-tag-name="Plant.Total_Power" at-color="#ff6b7f" at-blink="true" at-use-tag="true" /></atscada-alarm-card>
<!-- ngưỡng hằng -->
<atscada-alarm-card-item at-name="A19" at-content="1" at-data-tag-name="Plant.Faults" at-color="#ff6b7f" at-blink="true" at-use-tag="false" />
```

### B.5 `atscada-chart` - biểu đồ realtime (NVD3) [ES]

| Thuộc tính | Ý nghĩa | Giá trị | Mặc định C# |
|---|---|---|---|
| `at-content` | tiêu đề panel | | `Name` |
| `at-type` | loại | `line` \| `bar` \| `pie` \| `donut` (giá trị khác -> `line`) | `line` |
| `at-height` | chiều cao vùng vẽ (CSS) | vd `320px` | `250px` |
| `at-sample-num` | số điểm giữ lại của `line` (cửa sổ trượt) | số | `50` |
| `at-xlabel` | nhãn trục X (line, bar). Rỗng -> JS dùng `Time` | | `Time` |
| `at-ylabel` | nhãn trục Y. Rỗng -> `Value` | | `Value` |
| `at-grid-column` | | | `col-sm-12` |

Item con `atscada-chart-item`: `at-name` (mặc định `ChartItem`, không render), `at-content` (tên series/nhãn, mặc định `Chart Item`), `at-data-tag-name` (mặc định `TaskName.TagName`), `at-color` (mặc định `#008080`).

Hành vi:
- Mỗi chu kỳ đọc của view thêm 1 điểm. Giá trị chỉ được vẽ khi là số **và** `status === 'Good'`; ngược lại là `null` (đứt nét / cột trống).
- `line`: trục X là giờ (`%X`), Y định dạng `,.2f`, legend bật, nội suy `monotone`. Lịch sử chỉ nằm trong bộ nhớ trình duyệt - rời view là mất.
- `bar`: `discreteBarChart`, mỗi item một cột = giá trị hiện tại, hiện số trên cột. `pie`/`donut`: mỗi item một phần = giá trị hiện tại, nhãn phần trăm (`donutRatio .35`).
- `historical-line` / `historical-bar` cũng nằm trong factory nhưng dành cho `atscada-historical-chart`.

Ví dụ thật:
```xml
<atscada-chart at-roles="Admin, Operator" at-content="Power share by plant" at-type="donut" at-height="320px" at-sample-num="120" at-xlabel="" at-ylabel="kW" at-grid-column="col-xl-4 col-sm-6 col-12"><at-component-name>Chart_…</at-component-name><at-component-description>Chart</at-component-description><atscada-chart-item at-name="S24" at-content="Plastics Plant" at-data-tag-name="F1.Power" at-color="#38bdf8" /><atscada-chart-item at-name="S25" at-content="Metal Plant" at-data-tag-name="F2.Power" at-color="#a78bfa" /></atscada-chart>
```
[ES] dùng cả 4 loại: `line`, `bar`, `donut`, `pie`.

### B.6 `atscada-button` - nút đảo trạng thái [SRC]

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-content` | tiêu đề panel | `Button` |
| `at-button-text` | chữ trên nút | `Toggle` |
| `at-data-tag-name` | tag đọc/ghi | `TaskName.TagName` |
| `at-color` | màu nút khi giá trị không phải on/off | `#008080` |
| `at-active-color` | màu khi giá trị = `at-value-on` | `#28a745` |
| `at-inactive-color` | màu khi giá trị = `at-value-off` | `#dc3545` |
| `at-value-on` / `at-value-off` | chuỗi ghi/so sánh (so chuỗi chính xác sau `trim`) | `1` / `0` |
| `at-grid-column` | | `col-sm-3` |

Hành vi: click -> nếu giá trị hiện tại = on thì ghi off, ngược lại ghi on. Nút bị vô hiệu khi status khác `Good`. Chưa có trong config thật (controller ghi chưa đọc chi tiết).

### B.7 `atscada-switch` - công tắc (Switchery) [ES]

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-content` | tiêu đề | `Name` |
| `at-data-tag-name` | tag đọc/ghi | `TaskName.TagName` |
| `at-color` | màu khi bật | `#008080` |
| `at-size` | truyền thẳng cho Switchery (`small` / `default` / `large` theo thư viện; [ES] chỉ dùng `default`) | `default` |
| `at-value-on` / `at-value-off` | chuỗi ghi và so sánh | `1` / `0` |
| `at-grid-column` | | `col-sm-3` |

Hành vi: gạt -> sau **1 s** ghi `at-value-on`/`at-value-off`; ghi thành công thì khóa cập nhật hiển thị 20 s và ghi nhật ký (`Logger/AddLogger`). Hiện chữ status (xanh khi `Good`, đỏ khi khác); **khác `Good` thì công tắc bị khóa**. Giá trị tag không trùng on/off -> giữ nguyên vị trí.

Ví dụ thật:
```xml
<atscada-switch at-roles="Admin, Operator" at-content="Run enable" at-data-tag-name="F1M01.Cmd_Enable" at-color="#0f8a5f" at-size="default" at-value-on="1" at-value-off="0" at-grid-column="col-xl-2 col-sm-6 col-12">
```

### B.8 `atscada-attribute` - Input (ô nhập + nút Update) [ES]

**Tên thẻ XML là `atscada-attribute`** (XmlType của lớp `ATSCADAInput`), HTML render ra là `<atscada-input>`. Không có thẻ XML `atscada-input`.

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-content` | tiêu đề | `Name` |
| `at-data-tag-name` | tag đọc/ghi | `TaskName.TagName` |
| `at-grid-column` | | `col-sm-3` |

Hành vi: ô text hiện giá trị tag nguyên văn (không định dạng, **không có decimal-places, không có min/max, không kiểm tra kiểu**). Đang focus thì không bị ghi đè. Bấm Update -> sau **2 s** ghi chuỗi trong ô; thành công thì khóa hiển thị 20 s + ghi nhật ký. Status khác `Good`: ô và nút bị khóa, viền đỏ (`is-invalid`).

Ví dụ thật:
```xml
<atscada-attribute at-content="Days without accident" at-data-tag-name="F1.Safe_Days" at-grid-column="col-xl-2 col-lg-4 col-sm-6 col-12" at-roles="Admin, Operator"><at-component-name>Input_…</at-component-name><at-component-description>Input</at-component-description></atscada-attribute>
```

### B.9 `atscada-slider` - thanh trượt (ion.rangeSlider) [ES]

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-content` | tiêu đề | `Name` |
| `at-data-tag-name` | tag đọc/ghi | `TaskName.TagName` |
| `at-min` / `at-max` / `at-step` | kiểu double | `0` / `100` / `0.1` |
| `at-skin` | skin của ion.rangeSlider; CSS đi kèm có `flat`, `big`, `modern`, `sharp`, `round`, `square` ([ES] chỉ dùng `big`) | `big` |
| `at-grid-column` | | `col-sm-3` |

Hành vi: thả tay -> sau 0,5 s ghi giá trị. Lưu ý `at-min="0"` vẫn đúng vì chuỗi `"0"` không rỗng. (View của slider chưa đọc hết phần hiển thị status.)

Ví dụ thật:
```xml
<atscada-slider at-roles="Admin, Operator" at-content="Load setpoint (%)" at-data-tag-name="F1M01.Load_SP" at-min="40" at-max="120" at-step="5" at-skin="big" at-grid-column="col-xl-4 col-sm-6 col-12">
```

### B.10 `atscada-time-picker` - chọn khoảng giờ From/To [SRC]

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-content` | tiêu đề | `Time Range Picker` |
| `at-data-tag-hour-from` | tag giờ bắt đầu | `TaskName.HourFrom` |
| `at-data-tag-minute-from` | tag phút bắt đầu | `TaskName.MinuteFrom` |
| `at-data-tag-hour-to` | tag giờ kết thúc | `TaskName.HourTo` |
| `at-data-tag-minute-to` | tag phút kết thúc | `TaskName.MinuteTo` |
| `at-grid-column` | | `col-sm-3` |

Hai ô `<input type="time">` + nút Update; bấm Update ghi 4 tag (sau 150 ms). Chưa dùng trong project mẫu; định dạng số ghi xuống (có đệm 0 hay không) chưa kiểm chứng.

### B.11 `atscada-alarm-viewer` - bảng alarm mới nhất + ACK [ES]

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-content` | tiêu đề | `Alarm Viewer` |
| `at-connection` | tên connection string | `atscada` |
| `at-table-name` | bảng alarm | `alarmlog` |
| `at-limit` | số dòng mới nhất (server chấp nhận số nguyên 1..10000) | `50` |
| `at-interval` | chu kỳ làm mới (ms) | `3000` |
| `at-timeout` | timeout request (ms) | `30000` |
| `at-grid-column` | | `col-sm-12` |

Bảng DB cần các cột: `DateTime` (datetime), `TagName`, `TagAlias`, `Value`, `HighLevel`, `LowLevel`, `Status`, `Acknowledged` (đúng schema của iAlarmLogger). Truy vấn: `select * from <bảng> order by DateTime desc limit <n>`. Cột hiển thị (bản gốc mới và bản project mẫu): DateTime, Alias (`TagAlias`), Value, High Value, Low Value, Status, ACK. Dòng có `Acknowledged = 'No'` tô đỏ. Mục "Acknowledge" chạy `update <bảng> set Acknowledged='Yes' where Acknowledged='No'` (xác nhận **tất cả**; không giới hạn role).

Ví dụ thật:
```xml
<atscada-alarm-viewer at-roles="Admin, Operator" at-content="Latest alarms" at-connection="energysystem" at-table-name="alarmlog" at-limit="10" at-interval="3000" at-timeout="30000" at-grid-column="col-sm-12">
```

### B.12 `atscada-alarm-reporter` - báo cáo alarm theo khoảng thời gian + Excel [ES]

| Thuộc tính | Mặc định C# |
|---|---|
| `at-content` | `Alarm Reporter` |
| `at-connection` | `atscada` |
| `at-table-name` | `alarmlog` |
| `at-timeout` (ms) | `30000` |
| `at-grid-column` | `col-sm-12` |

Cùng schema bảng như B.11. Truy vấn `select * … where DateTime between @from and @to order by DateTime asc`. Có bộ chọn khoảng ngày giờ (mặc định từ 00:00 hôm nay đến hiện tại), nút Report và Export Excel (template `ReportTemplate\AlarmReport.xlsx`).

Ví dụ thật: `<atscada-alarm-reporter at-roles="Admin, Operator" at-content="Alarm history report" at-connection="energysystem" at-table-name="alarmlog" at-timeout="30000" at-grid-column="col-sm-12">`

### B.13 `atscada-data-reporter` - báo cáo dữ liệu log + Excel [ES]

| Thuộc tính | Mặc định C# |
|---|---|
| `at-content` | `Data Reporter` |
| `at-connection` | `atscada` |
| `at-table-name` (bảng có cột `DateTime`) | `datalog` |
| `at-timeout` (ms) | `30000` |
| `at-grid-column` | `col-sm-12` |

Item con **`atscada-data-reporter-item`** (đây là tên phần tử trong XML; XmlType của lớp là `atscada-data-report-item` nhưng parent khai `[XmlElement("atscada-data-reporter-item")]`):

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-alias` | **tên cột thật trong DB** | `Alias` |
| `at-name` | **nhãn hiển thị**: tiêu đề cột bảng web, tiêu đề cột Excel, và được ghi vào SQL làm alias (`select DateTime, \`alias\` as \`name\``) | `DataReporterItem` |
| `at-color` | màu nền cột trong Excel / màu đường trong sheet Chart (hex) | `#008080` |
| `at-min` / `at-max` / `at-avr` | `true`: thêm dòng thống kê Min / Max / Average cho cột này trong Excel | `true` cả ba |

Ràng buộc `at-name` và `at-alias` (`SqlGuard.Identifier`): 1-64 ký tự, không có dấu backtick, không ký tự điều khiển, không khoảng trắng đầu/cuối. `at-name` phải **duy nhất** trong một reporter (trùng thì item sau bị bỏ). Bộ sinh file mẫu giữ `at-name` thuần ASCII (đổi `°C`->`degC`, `·`->`-`). Cột DateTime luôn tự có. Kết quả hiển thị mới nhất trước.

Ví dụ thật:
```xml
<atscada-data-reporter at-roles="Admin, Operator" at-content="Monthly ESG report" at-connection="energysystem" at-table-name="esg_monthly" at-timeout="30000" at-grid-column="col-sm-12"><at-component-name>DataReport_…</at-component-name><at-component-description>DataReport</at-component-description><atscada-data-reporter-item at-name="Energy (kWh)" at-alias="Energy_kWh" at-color="#e2e8f0" at-min="false" at-max="false" at-avr="false" /><atscada-data-reporter-item at-name="CO2 emissions (kg)" at-alias="CO2_kg" at-color="#e2e8f0" at-min="false" at-max="false" at-avr="false" /></atscada-data-reporter>
```

### B.14 `atscada-historical-chart` - biểu đồ lịch sử từ DB [ES]

| Thuộc tính | Ý nghĩa | Giá trị | Mặc định C# |
|---|---|---|---|
| `at-content` | tiêu đề | | `Name` |
| `at-type` | loại | `historical-line` \| `historical-bar` | `historical-line` |
| `at-height` | chiều cao | vd `320px` | `250px` |
| `at-bgcolor` | màu nền vùng vẽ; đúng chuỗi `None` (N hoa) = không đặt | CSS color \| `None` | `None` |
| `at-opacity` | opacity vùng vẽ | `0`..`1` | `1` |
| `at-xlabel` / `at-ylabel` | nhãn trục | | `Time` / `Value` |
| `at-connection` | tên connection string (chung cho mọi item) | | `atscada` |
| `at-grid-column` | | | `col-sm-12` |

Item con `atscada-historical-chart-item`: `at-name` (mặc định `ChartItem`, không render), `at-content` (tên series, mặc định `Chart Item`), `at-table` (bảng, mặc định `datalog`), `at-column` (cột, mặc định `Temperature`), `at-color` (mặc định `#008080`). Mỗi item có thể lấy từ bảng khác nhau.

Hành vi:
- Truy vấn mỗi item: `select DateTime, <cột> from <bảng> where DateTime between @from and @to order by DateTime asc`. Tự chạy báo cáo 1 lần khi mở (khoảng mặc định: 00:00 hôm nay -> bây giờ), sau đó người dùng chọn khoảng và bấm Report. `historical-line` giảm mẫu còn tối đa 2000 điểm/series (giữ min/max mỗi nhóm).
- Server trả kết quả theo khóa `at-content` -> **`at-content` các item phải khác nhau** (trùng thì item sau bị bỏ). Client gán series theo **thứ tự**: nếu một item không có dòng nào trong khoảng thì nó bị bỏ khỏi kết quả và các series sau **dịch lên** (lệch tên/màu) - suy ra từ mã, cần lưu ý khi ghép nhiều bảng.
- JS có đọc `at-refresh-time` nhưng C# không có thuộc tính XML này (không cấu hình được).

Ví dụ thật:
```xml
<atscada-historical-chart at-roles="Admin, Operator" at-content="Complex power - history (kW)" at-type="historical-line" at-height="320px" at-bgcolor="None" at-opacity="1" at-xlabel="Time" at-ylabel="kW" at-connection="energysystem" at-grid-column="col-xl-6 col-12"><at-component-name>HChart_…</at-component-name><at-component-description>HChart</at-component-description><atscada-historical-chart-item at-name="H41" at-content="Total" at-table="datalog_plant" at-column="Total_Power" at-color="#53b8ff" /><atscada-historical-chart-item at-name="H42" at-content="Grid" at-table="datalog_plant" at-column="Grid_Power" at-color="#a78bfa" /></atscada-historical-chart>
```
[ES] dùng cả `historical-line` và `historical-bar`.

### B.15 `atscada-energy-reporter` - báo cáo điện năng theo giờ/ngày/tháng/năm [ES]

| Thuộc tính | Mặc định C# |
|---|---|
| `at-content` | `Energy Reporter` |
| `at-connection` | `atscada` |
| `at-table-name` | `energylog` |
| `at-timeout` (ms) | `30000` |
| `at-grid-column` | `col-sm-12` |

Item con **`atscada-energy-reporter-item`** (XmlType lớp là `atscada-energy-report-item`, tên phần tử XML là `atscada-energy-reporter-item`): `at-alias` = **cột DB chứa chỉ số tích lũy** (mặc định `Alias`), `at-name` = nhãn cột (mặc định `EnergyReporterItem`, duy nhất, cùng ràng buộc 64 ký tự/không backtick), `at-color` (mặc định `#008080`, dùng cho Excel).

Hành vi: người dùng chọn Report Type `Hourly` / `Daily` / `Monthly` / `Yearly` (mặc định Hourly). Với mỗi kỳ, server tính **`max(0, giá_trị_cuối_trước_cuối_kỳ − giá_trị_cuối_trước_đầu_kỳ)`**, trong đó "giá trị cuối trước thời điểm T" = dòng cuối có `DateTime <= T` (không có dòng -> 0). Vì vậy cột phải là **bộ đếm tích lũy tăng dần** (kWh tổng), không phải công suất tức thời. Kết quả 2 chữ số thập phân. Bảng cần cột `DateTime`. Export dùng `ReportTemplate\EnergyReport.xlsx`.

Ví dụ thật:
```xml
<atscada-energy-reporter at-roles="Admin, Operator" at-content="Plant and machine energy by hour / day / month / year (kWh)" at-connection="energysystem" at-table-name="datalog_f1" at-timeout="60000" at-grid-column="col-sm-12"><at-component-name>EnergyReport_…</at-component-name><at-component-description>EnergyReport</at-component-description><atscada-energy-reporter-item at-name="Energy (kWh)" at-alias="Energy" at-color="#ffffff" /><atscada-energy-reporter-item at-name="Machine 01 - Energy (kWh)" at-alias="M01_Energy" at-color="#38bdf8" /></atscada-energy-reporter>
```

### B.16 `atscada-svg` - sơ đồ SVG gắn tag [ES]

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-content` | **toàn bộ markup `<svg>…</svg>`**, escape XML trong thuộc tính (`&lt; &gt; &quot; &amp;`), xuống dòng đổi thành dấu cách. Được chèn nguyên văn vào trang | `Name` |
| `at-path` | đường dẫn file SVG gốc (thông tin cho công cụ thiết kế); **runtime không dùng** | (null) |
| `at-color` | nền của `<div>` bọc SVG (`background:{at-color}`) | `#008080` |
| `at-grid-column` | | `col-sm-12` |

Item con (thứ tự khai trong C#: value, alarm, cutaway, hyperlink, controlvalue). **Tên phần tử XML đều chữ thường** (parent khai `[XmlElement]`), dù XmlType của lớp viết hoa lẫn lộn:

| Phần tử XML | Thuộc tính XML (chính xác) | Mặc định C# |
|---|---|---|
| `atscada-svgvalue-item` | `at-name`, `at-min`, `at-type`, `at-max`, `at-properties`, `at-content`, `at-data-tag-name`, `at-bad` | name `SVGValueItem`, min `0`, max `100`, type `Bool`, properties `Value`, content `SVGValue Item`, tag `TaskName.TagName`, bad `` |
| `atscada-svgalarm-item` | `at-name`, `at-content`, `at-highalarm`, `at-Lowalarm` (chữ L hoa), `at-data-tag-name` | name `SVGalarmItem`, content `SVGalarm Item`, ba tag đều `TaskName.TagName` |
| `atscada-svgcutaway-item` | `at-name`, `at-id2`, `at-min`, `at-max`, `at-data-tag-name`, `at-atribute` (sai chính tả, giữ nguyên) | name `SVGCutawayItem`, id2 `SVGCutawayItem`, min `0`, max `0`, atribute `Cutaway` |
| `atscada-svghyperlink-item` | `at-name`, `at-type`, `at-color`, `at-data-tag-name` | name `SVGHyperLinkItem`, type `0`, color `link` |
| `atscada-svgcontrolvalue-item` | `at-name`, `at-atribute`, `at-data-tag-name`, `at-type` | name `SVGControlValueItem`, atribute ``, type `` |

Ánh xạ XML -> HTML (đây là chỗ dễ nhầm):
- Mọi item: `at-name` (XML) -> `at-content` (HTML) = **id của phần tử SVG**.
- Value item: **`at-bad` (XML) -> `at-attribute` (HTML) = chuỗi tùy chọn**. `at-content` của value item trong XML không được render (để nguyên `SVGValue Item`).
- Alarm item: `at-highalarm` -> `at-data-hight-tag-name` (sic), `at-Lowalarm` -> `at-data-low-tag-name`. `at-content` không render.
- Cutaway và controlvalue: chuỗi tùy chọn ở `at-atribute` (XML và HTML cùng tên).

Chi tiết hành vi: xem mục C. [ES] dùng value (978), alarm (52), cutaway (119), hyperlink (107); **controlvalue chưa dùng**.

Ví dụ thật (SVG rút gọn):
```xml
<atscada-assembly at-value="ATSCADAWebApp.Component.SVG.ATSCADASVG, ATSCADAFastWeb.Component, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null"><atscada-svg at-roles="Admin, Operator" at-path="svg\overview.svg" at-content="&lt;svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 1920 1080&quot; preserveAspectRatio=&quot;xMidYMid meet&quot; font-family=&quot;Segoe UI, Roboto, Arial, sans-serif&quot;&gt; ... &lt;/svg&gt;" at-color="#0b1220" at-grid-column="col-sm-12"><at-component-name>SVG_…</at-component-name><at-component-description>SVG</at-component-description>
<atscada-svgvalue-item at-name="TXT_P_Total" at-min="0" at-type="Double" at-max="999999999" at-properties="Value" at-content="SVGValue Item" at-data-tag-name="Plant.Total_Power" at-bad="" />
<atscada-svgvalue-item at-name="…" at-min="0" at-type="Color" at-max="999999999" at-properties="Animation" at-content="SVGValue Item" at-data-tag-name="…" at-bad="1-#334155,1-#0f8a5f,2-#c2334a" />
<atscada-svgvalue-item at-name="…" at-min="0" at-type="Rotate" at-max="999999999" at-properties="Animation" at-content="SVGValue Item" at-data-tag-name="…" at-bad="Rotate" />
<atscada-svgvalue-item at-name="…" at-min="0" at-type="Conveyor" at-max="999999999" at-properties="Animation" at-content="SVGValue Item" at-data-tag-name="…" at-bad="Conveyor" />
<atscada-svgalarm-item at-name="ALM_F1M01" at-content="SVGAlarm Item" at-highalarm="F1M01.Hi_Power_P" at-Lowalarm="F1M01.Lo_Power_P" at-data-tag-name="F1M01.Power_P" />
<atscada-svgcutaway-item at-name="TANK_FR" at-id2="TANK_LV" at-min="0" at-max="100" at-data-tag-name="Util.Tank_Level" at-atribute="20-#ff6b7f,#22d3ee,95-#ffd057;Dir=Up" />
<atscada-svghyperlink-item at-name="LINK_F1" at-type="Link" at-color="#53b8ff" at-data-tag-name="F1.Link" />
</atscada-svg></atscada-assembly>
```

### B.17 `atscada-user` - quản lý tài khoản [ES]

Chỉ có `at-grid-column` (mặc định `col-sm-12`) và `at-roles`. Bảng user: thêm/sửa/xóa, role chọn `Admin` hoặc `Operator`. API (`UserController`) đòi role `Admin` (khi `at-required="true"`), dùng connection của `at-authentication` và bảng cố định `useraccount`. Mật khẩu mới: tối thiểu 8 ký tự và có ít nhất 3 trong 4 loại (hoa, thường, số, ký tự đặc biệt). Lưu MD5 hex hoa.

Ví dụ thật: `<atscada-user at-roles="Admin" at-grid-column="col-sm-12"><at-component-name>User_…</at-component-name><at-component-description>User</at-component-description></atscada-user>` (đặt trong view cũng `at-roles="Admin"`).

### B.18 `atscada-google-map` - bản đồ (thực tế là Leaflet + OpenStreetMap) [ES]

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-content` | tiêu đề | `ATSCADA Map` |
| `at-application-name` | tên ứng dụng (truyền cho marker) | `DemoMap` |
| `at-connection` | connection string cho chế độ lịch sử hành trình | `atscada` |
| `at-height` | chiều cao bản đồ | `300px` |
| `at-api-key` | khóa Google Maps - bản hiện tại dùng tile `https://{s}.tile.openstreetmap.org`, để rỗng | `` |
| `at-grid-column` | | `col-sm-12` |

Item `atscada-marker-item`: `at-name` (`MarkerItem`), `at-alias` (tên hiển thị, `Marker Item`), `at-location-tag-name` (tag chứa vị trí dạng chuỗi **`lat;lng`** hoặc `lat,lng`), `at-color` (`#008080`), `at-show` (`checked`/`unchecked`, mặc định `checked`), `at-movable` (`checked` = thiết bị di động, vẽ vệt; `unchecked` = điểm cố định, chỉ nhận vị trí lần đầu; mặc định `checked`), `at-new-tab` (`checked`/`unchecked`, áp dụng cho URL `http…`; mặc định `checked`), `at-table` (bảng log cho chế độ History: cần cột `DateTime`, `Location`, các cột sau là tham số; mặc định `datalog`), `at-url` (click marker: chứa `http` -> mở URL; dạng **`~/<at-location>`** -> chuyển sang view đó; rỗng hoặc `http://` -> không làm gì; mặc định `http://`).
Item cháu `atscada-param-item` (trong marker): `at-name` (`Paramater Item`), `at-alias` (nhãn), `at-param-tag-name` (tag hiển thị khi rê chuột).

Cần thư viện `AppTemplate\plugins\leaflet\leaflet.js|css` (Index.cshtml nạp sẵn) và trình duyệt phải tải được tile OSM. Lưu ý header CSP trong Web.config gốc: `img-src 'self' data: https:` (cho phép tile https).

Ví dụ thật:
```xml
<atscada-google-map at-roles="Admin, Operator" at-content="Complex site map (VSIP I, Binh Duong) - hover a marker for live values, click to open the plant" at-application-name="project mẫu" at-connection="energysystem" at-height="460px" at-grid-column="col-sm-12" at-api-key=""><at-component-name>Map_…</at-component-name><at-component-description>Map</at-component-description><atscada-marker-item at-name="F1" at-alias="Plastics Plant" at-location-tag-name="F1.Location" at-color="#38bdf8" at-show="checked" at-movable="unchecked" at-new-tab="unchecked" at-table="datalog_f1" at-url="~/plastics-plant"><atscada-param-item at-name="P1" at-alias="Power (kW)" at-param-tag-name="F1.Power" /><atscada-param-item at-name="P2" at-alias="Machines running" at-param-tag-name="F1.Running" /></atscada-marker-item></atscada-google-map>
```

### B.19 `atscada-stream-camera` - camera (video.js HLS) [SRC]

| Thuộc tính | Ý nghĩa | Mặc định C# |
|---|---|---|
| `at-content` | tiêu đề | `Camera` |
| `at-connection` | **tên connection string** trong Web.config chứa thông số camera (không phải DB): chuỗi `key=value;…` với khóa `AppID`/`uid`/`user`/`username`, `AppSecret`/`pwd`/`password`/`secret`, `DeviceID`/`cameraID`/`device`/`deviceID` (hoặc 3 giá trị theo thứ tự) | `camera` |
| `at-network` | `Cloud` (Imou cloud) hoặc `onvif` (server tự phát HLS `/Camera/Hls?camera=<connection>&file=live.m3u8`); JS đổi về chữ thường | `Cloud` |
| `at-frame-size` | class video.js | `vjs-fluid` |
| `at-token-time` | chuỗi số giây | `300` |
| `at-grid-column` | | `col-sm-12` |

Chưa dùng trong project mẫu. `Render()` trong nguồn thiếu ký tự `>` đóng thẻ mở (`…at-frame-size="…" </atscada-stream-camera></div>`) - chưa kiểm chứng component này chạy đúng.

---

## C. SVG - chi tiết từ `atscada-svg-element.js` và `atscada-svg-view.js`

### C.1 Cách tìm phần tử và phạm vi

- Mọi item tìm phần tử bằng **`document.getElementById(<at-name>)`** - id tính trên **toàn trang**. Id phải duy nhất trong cả view (kể cả các SVG khác và HTML khác). Bộ sinh file mẫu chỉ cho id dạng `^[A-Za-z][A-Za-z0-9_]*$`.
- `atscada-svg` thu item bằng `document.getElementsByTagName('atscada-svg…-item')` - tức **mỗi `atscada-svg` lấy toàn bộ item của cả trang**, không chỉ con của nó. Hai `atscada-svg` trong cùng một view sẽ cùng gắn handler cho mọi item (trùng lặp). Cách đã chứng minh: **mỗi view đúng một `atscada-svg`** (project mẫu: 30 SVG / 30 view có sơ đồ).
- Không tìm thấy id -> item bị bỏ qua im lặng.
- Tránh hai id `roller-flow3` và `processPath3`: mã Conveyor có tham số cứng riêng cho chúng.
- CSS `<style>` nhúng trong SVG có hiệu lực toàn trang (SVG inline) -> đặt tiền tố riêng cho class/keyframes (project mẫu dùng `es-`).

### C.2 Kích thước, nền, toàn màn hình

- Component chèn CSS toàn cục `svg { height: 100% !important; width: 100% !important; }`. SVG nên có **`viewBox` và không đặt `width`/`height` cố định**; chiều cao theo tỉ lệ viewBox ở bề rộng 100% của cột. Đã chứng minh: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" font-family="…">`.
- Nền: `<div style="background:{at-color}">` bọc SVG. `atscada-svg` có `margin-bottom: 16px`.
- Toàn màn hình: tự thêm thanh công cụ phía trên bản vẽ với nút `⛶` (`.atscada-fullscreen-btn`). Dùng Fullscreen API của trình duyệt, không được thì dùng class `atscada-svg-fullscreen-mode` (position fixed phủ màn hình). Nền toàn màn hình `#070c18`, SVG co theo `contain`. Thoát bằng Esc. Không có thuộc tính XML nào bật/tắt nút này.
- Popup nhập số (control Analog) dùng `#overlay` / `#popup` chèn vào `body`.

### C.3 `atscada-svgvalue-item` - theo `at-properties`

Chuỗi tùy chọn nằm ở **`at-bad`**. Nếu `at-bad` rỗng, JS thay bằng chuỗi `attribute` (vô hại). `at-min`, `at-max` và các `at-type` kiểu dữ liệu (`Bool`, `Double`…) **không được view dùng** (hàm `convertValue` không ai gọi).

**1) `at-properties="Value"`** - `element.innerHTML = giá trị` (nguyên chuỗi từ tag).
- **Không làm tròn, không decimal-places, không đơn vị.** Muốn 1 số lẻ phải định dạng ở nguồn (project mẫu: ứng dụng desktop ghi chuỗi đã định dạng vào tag). Đơn vị đặt ở `<text>` riêng. Toàn bộ nội dung phần tử bị thay -> dùng `<text id>` hoặc `<tspan id>` riêng cho số.
- Giá trị `null`/`undefined` (chưa có dữ liệu): giữ nguyên nội dung cũ (project mẫu để sẵn `--`).
- Không theo dõi chất lượng: tag Bad vẫn hiện chuỗi giá trị server trả về.
- [ES]: `at-type="Double" at-properties="Value" at-bad=""`.

**2) `at-properties="Status"` + `at-type="Color"` hoặc `"Text"`** - theo **chất lượng tag** (Good / khác Good), không theo giá trị:
- `at-type="Color"`: `at-bad="<màu khi Bad>--<màu khi Good>"` -> `style.fill`. Thiếu phần sau -> dùng màu Bad cho cả hai.
- `at-type="Text"`: `at-bad="<chữ khi Good>--<chữ khi Bad>"` -> `innerHTML`. (Thứ tự Good/Bad **ngược nhau** giữa Color và Text.)
- Phân tách bằng đúng hai dấu gạch `--`. So status không phân biệt hoa thường với `good`.
- [SRC] - không có trong config mẫu.

**3) `at-properties="Animation"`** - chọn nhánh theo thứ tự kiểm tra sau (nhánh đầu khớp sẽ chạy). "Bật" nghĩa là giá trị `== 1` (`1`, `"1"`, `true`; so lỏng của JS). `null` -> không làm gì.

| Thứ tự | Điều kiện khớp | Tùy chọn trong `at-bad` (cách nhau `;`) | Hành vi |
|---|---|---|---|
| 1 | `at-type="Rotate"` hoặc `at-bad` chứa `Rotate` | `Dir=CCW`; `Speed=<số>s` hoặc `<số>ms` (mặc định `1s`); `Preset=robota` \| `robotb` \| `oscillate` \| `spin` | Nếu phần tử **đã có CSS animation riêng** (tên khác `svg-spin-cw/ccw`, `svg-robot-*`): chỉ đặt `animation-play-state` = `running` khi bật, `paused` khi tắt (`!important`). Nếu chưa có: gán quay vô hạn quanh tâm (`transform-box: fill-box; transform-origin: center`), CW hoặc CCW; tắt -> `paused` (dừng tại chỗ). Preset robot / id chứa `robot` (trừ `Preset=spin`) -> lắc qua lại thay vì quay |
| 2 | `at-type="Pulse"` hoặc chứa `Pulse` | `Speed=` (mặc định `1s`) | bật: co giãn scale 1↔1.15; tắt: `animation: none` |
| 3 | `at-type="Blink"` **và** `at-bad` không chứa dấu `-` | `Speed=` (mặc định `0.8s`) | bật: opacity 1↔0.15; tắt: `animation: none` |
| 4 | `at-type="Conveyor"` hoặc chứa `Conveyor` | `Dir=CCW`; `Speed=` (mặc định `0.5s`); `Dash=` (12); `Gap=` (6); `Cycles=` (2); `FPS=` | Phần tử là `<path>`: vẽ nét đứt chạy bằng canvas phủ lên (path gốc bị ẩn). Phần tử khác (`polyline`, `g`…) **có CSS animation riêng**: chỉ bật/tắt `animation-play-state`. Phần tử khác không có animation riêng: chỉ đặt biến `--conv-*` và class `atscada-conveyor-cw-active` / `-ccw-active` / `-paused` - **không có CSS nào đi kèm cho các class này** nên không thấy gì trừ khi SVG tự định nghĩa |
| 5 | `at-type="Vibrate"` hoặc chứa `Vibrate` | `Speed=` (mặc định `0.1s`) | bật: rung ±2px; tắt: none |
| 6 | `at-type="Translate"` hoặc chứa `Translate` | `Speed=` (mặc định `2s`); `Pos1=x,y`; `Pos2=x,y` (hoặc `Dist=x,y`; mặc định `0,-50px`); `Pos3=x,y`; `Loop=1\|true\|yes`; `HideAtEnd=1\|true\|yes` (đồng nghĩa `VisibleAtEnd=`) | Phần tử được bọc trong `<g data-atscada-translate-for>` rồi tịnh tiến Pos1->Pos2(->Pos3). Tọa độ là giá trị CSS **có đơn vị** (`100px`). Không Loop/HideAtEnd: đi-về vô hạn. `HideAtEnd`: chạy 1 lần rồi ẩn. `Loop`+`HideAtEnd`: lặp một chiều, mờ ở hai đầu. Tắt: dừng, về vị trí gốc |
| 7 | `at-bad` chứa dấu `-` và `at-type="Color"` | bảng ngưỡng (xem dưới) | đổi `style.fill` |
| 8 | `at-bad` chứa dấu `-` và `at-type="Blink"` | bảng ngưỡng | đổi `style.fill` theo ngưỡng **và luôn nháy** (`blink-animation 1s infinite`, opacity 1↔0) ở mọi dải |

Lưu ý: nhánh 1-6 khớp cả theo **nội dung chuỗi**, nên bảng màu không được chứa các từ `Rotate`, `Pulse`, `Conveyor`, `Vibrate`, `Translate`.

**Ngữ pháp bảng ngưỡng màu** (nhánh 7, 8): `k1-c1,k2-c2,…,kn-cn`
- Tách bằng `,` rồi mỗi cặp tách bằng `-` (lấy 2 phần đầu). Khóa đọc bằng `parseInt` -> **chỉ số nguyên không âm**; màu không được chứa `-` hay `,` (dùng hex `#rrggbb`, tên màu, `transparent`; không dùng `rgb(…)`).
- Quy tắc chọn với giá trị `v`: `v < k1` -> `c1`; `k(i) <= v <= k(i+1)` -> `c(i+1)` (lấy cặp đầu tiên thỏa); `v > kn` -> `cn`. Tức mỗi màu là màu của dải **kết thúc** tại khóa của nó.
- Mẫu đã chứng minh [ES]:
  - bool 0/1: `1-<màu tắt>,2-<màu bật>` (0 -> tắt; 1 -> bật). Vd `1-transparent,2-#fde047`.
  - 3 trạng thái 0/1/2: `1-<màu 0>,1-<màu 1>,2-<màu 2>`. Vd `1-#334155,1-#0f8a5f,2-#c2334a` (dừng / chạy / sự cố). Dùng `transparent` để ẩn/hiện lớp theo trạng thái (`1-transparent,1-#ffffff,2-transparent`).
- Chỉ đổi `fill` (không đổi `stroke`). Giá trị không phải số -> không đổi gì.

Mẫu "chạy/dừng hoạt hình nhúng sẵn" đã chứng minh [ES]: trong SVG khai `animation: … infinite paused` cho phần tử (hoặc nhóm cha, con dùng `animation-play-state: inherit`), rồi gắn item `at-type="Rotate" at-bad="Rotate"` (cho `<g>`) hoặc `at-type="Conveyor" at-bad="Conveyor"` (cho `<polyline>` có `stroke-dasharray`); tag = 1 thì chạy.

### C.4 `atscada-svgalarm-item`

- `at-name` = id phần tử; `at-data-tag-name` = tag giá trị; **`at-highalarm` = TÊN TAG ngưỡng cao; `at-Lowalarm` = TÊN TAG ngưỡng thấp** (là tag, không phải hằng số; cả ba được đưa vào danh sách đọc).
- Khi `high < value` hoặc `low > value` (so số): `fill = red` + nháy `blink-animation 1s infinite`. Bình thường: trả `fill` về màu gốc đã ghi nhớ (computed fill lần đầu) và đặt `animation: none`.
- Ngưỡng không phải số (tag trống/Bad) -> phía đó không bao giờ báo. Vì item đặt `animation: none`, dùng một phần tử riêng cho alarm (không dùng chung phần tử đang có hoạt hình).
- Ví dụ thật: `<atscada-svgalarm-item at-name="ALM_F1M01" at-content="SVGAlarm Item" at-highalarm="F1M01.Hi_Power_P" at-Lowalarm="F1M01.Lo_Power_P" at-data-tag-name="F1M01.Power_P" />`

### C.5 `atscada-svgcutaway-item` - thanh mức / bồn

- **`at-name` = id của `<rect>` KHUNG làm mốc** (đọc `x`, `y`, `width`, `height` bằng `getAttribute` - phải là thuộc tính số). **`at-id2` = id của `<rect>` PHẦN TÔ** bị thay đổi kích thước. (Chú thích trong mã nguồn ghi ngược; đây là theo mã thực thi và theo config mẫu: `at-name="TANK_FR" at-id2="TANK_LV"`.)
- Kích thước phần tô = `value / at-max × kích thước khung`. **`at-min` không được dùng**; không kẹp biên (value > max sẽ tràn khung).
- Chuỗi tùy chọn ở **`at-atribute`**: `<kLow>-<màu thấp>,<màu bình thường>,<kHigh>-<màu cao>[;Dir=<hướng>]`
  - Màu: `v < kLow` -> màu thấp; `v > kHigh` -> màu cao; còn lại màu bình thường. Cần đủ 3 phần cách nhau dấu phẩy, nếu không sẽ không đổi màu. Áp vào `style.fill` của phần tô.
  - `Dir=Up` (mặc định khi không ghi): cao dần từ đáy khung. `Dir=Down`: từ đỉnh xuống. `Dir=Right`: rộng dần từ cạnh trái. `Dir=Left`: từ cạnh phải sang trái. (Giá trị khác `Up`/`Down` đều đi nhánh ngang; khác `Left` thì neo trái.)
  - Một màu cố định: `0-<c>,<c>,999-<c>`.
- Chỉ cập nhật khi giá trị tag thay đổi.
- Ví dụ thật: `at-atribute="20-#ff6b7f,#22d3ee,95-#ffd057;Dir=Up"` (bồn), `at-atribute="0-#53b8ff,#53b8ff,100-#ffd057;Dir=Right"` với `at-max="110"` (thanh ngang).

### C.6 `atscada-svghyperlink-item`

- `at-name` = id phần tử nhận click (con trỏ `pointer`). **`at-data-tag-name` = tag mà GIÁ TRỊ của nó là URL đích**; click -> `window.location.href = <giá trị tag>`.
- **Không có thuộc tính nào chứa URL trực tiếp.** `at-type` và `at-color` được đọc nhưng view không dùng (project mẫu ghi `at-type="Link" at-color="#53b8ff"`).
- Để chuyển sang view khác trong web: tag phải chứa chuỗi **`#/<at-location>`**. Đã chứng minh [ES]: ứng dụng desktop ghi `"#/" + loc` vào tag bộ nhớ (`F1.Link`, `F1M01.Link`, `Nav.Util`…), view đích có thể `at-visible="false"`.
- Handler chỉ gắn khi tag phát sự kiện đổi giá trị lần đầu; tag chưa có giá trị thì chưa click được.
- Vùng bấm: project mẫu vẽ `<rect>`/`<polygon>` trong suốt có id phủ lên vùng cần bấm.

### C.7 `atscada-svgcontrolvalue-item` [SRC]

- `at-name` = id phần tử, `at-data-tag-name` = tag ghi, `at-type`:
  - `Swich` (đúng chính tả sản phẩm) hoặc `Switch`: giá trị `"1"` -> `fill` `green`, `"0"` -> `red`; click ghi giá trị đảo (`"1"`<->`"0"`).
  - `Analog`: click mở popup có ô nhập (hiện giá trị hiện tại) + nút OK (Enter = OK, bấm ra ngoài = hủy) rồi ghi chuỗi nhập.
- `at-atribute`: view không dùng. Handler chỉ gắn sau khi tag đổi giá trị lần đầu. Chưa có trong config thật.

### C.8 Tóm tắt Bad quality / định dạng trên SVG

| Loại | Khi tag Bad / null |
|---|---|
| Value | null: giữ chữ cũ. Bad có giá trị: vẫn hiện giá trị. Không định dạng số |
| Status + Color/Text | hiển thị nhánh Bad (đây là cách duy nhất để SVG phản ánh chất lượng) |
| Animation | null: giữ nguyên trạng thái; chỉ xét `== 1` |
| Alarm | NaN -> không báo |
| Cutaway | `parseFloat(null)` = NaN -> kích thước NaN (không hợp lệ); chỉ chạy khi có sự kiện đổi giá trị |
| Hyperlink | giá trị null -> link trỏ tới `null` (tránh để tag link Bad) |

---

## D. Report template và Web.config

### D.1 `ReportTemplate\*.xlsx` (thư mục gốc web; đường dẫn cố định trong `ExportController`)

| File | Sheet | Ô cố định trong template | Mã ghi gì |
|---|---|---|---|
| `AlarmReport.xlsx` | `Data` (sheet thứ nhất) | A3 `From Date`, A4 `To Date`, hàng 6: `DateTime, Tag Name, Tag Alias, Value, High Level, Low level, Status, ACK` | A2 = `at-content` (gộp A2:H2), B3/B4 = từ/đến, dữ liệu từ A7 |
| `DataReport.xlsx` | `Data`, `Chart` (tìm **theo tên sheet**) | A3 `From Date`, A4 `To Date`, A6 `DateTime` | A2 = tiêu đề, B3/B4 = từ/đến; nếu có item bật min/max/avr: bảng thống kê `Name, Min, Max, Average` từ hàng 6 và bảng dữ liệu lùi xuống; tiêu đề cột = `at-name`; sheet `Chart` vẽ line chart, màu theo `at-color` |
| `EnergyReport.xlsx` | `Data`, `Chart` | giống hệt `DataReport.xlsx` (hai file trùng byte) | tiêu đề hàng 6, dữ liệu từ hàng 7, line chart |

Export chỉ dùng được sau khi đã bấm Report (dữ liệu lấy từ `TempData` của phiên). Thiếu file template -> export lỗi.

### D.2 Web.config - những phần XML phụ thuộc

- `<connectionStrings>`: mỗi `at-connection` / `at-compare-connection` trong XML là **`name`** của một `<add>`. Tên phải qua `SqlGuard.Identifier` (1-64 ký tự, không backtick). Mẫu:
  `<add name="energysystem" connectionString="server=localhost;uid=<user>;pwd=<password>;database=energysystem" providerName="MySql.Data.MySqlClient" />`
  `providerName` quyết định loại SQL (`SqlDialect.KindOf`): MySQL là mặc định; có nhánh SQL Server trong mã (chưa kiểm chứng giá trị providerName cụ thể).
- **Connection tên `atscada` bắt buộc phải tồn tại**: `LoggerController` (nhật ký ghi tag của Switch/Input) dùng cứng `ConnectionStrings["atscada"]` và tự tạo bảng `eventlogs` (`DateTime`, `Action`, `User`). Nhật ký đăng nhập thì ghi `eventlogs` trên connection của `at-authentication`.
- Connection của `at-authentication`: cần bảng `useraccount` (`UserName`, `Password` = MD5 hex hoa, `Role`).
- Connection cho camera (`atscada-stream-camera`): xem B.19.
- **Địa chỉ/cổng dịch vụ tag không nằm trong Web.config** - lấy từ `<at-service>` của XML.
- Khác: `AppConfig` nằm trong `hiddenSegments` (không tải được qua HTTP); `customErrors mode="On"`; cookie `sameSite="Strict"`; header CSP `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com` -> SVG/trang **không nạp được script, font, CSS từ CDN ngoài**; ảnh ngoài chỉ qua https. `X-Frame-Options: DENY` (không nhúng web vào iframe). mimeMap `.m3u8`.
- Bảng DB mà component mong đợi: alarm (`DateTime, TagName, TagAlias, Value, HighLevel, LowLevel, Status, Acknowledged`); data/energy/historical/compare (`DateTime` kiểu datetime + các cột dữ liệu; project mẫu tạo cột dữ liệu kiểu `varchar(32)` và server tự parse số).

---

## E. Bản gốc và tùy biến của project mẫu

Project mẫu có một script vá bản Fastweb của nó (chạy lại nhiều lần được). Bảng dưới cho biết hành vi nào là của bản gốc, hành vi nào do script đó thêm, để không trông chờ vào thứ máy khác không có.

| # | Thay đổi của patch | Bản gốc (stock) |
|---|---|---|
| 1 | Web.config: thêm/cập nhật connection string tên dự án (`energysystem`, MySQL). Không đụng `atscada` | chỉ có `atscada`, `solarfarm`, `DemoGSDN` |
| 2 | `colHeader()` trong `atscada-data-reporter-element.js` và `atscada-energy-reporter-element.js`: ánh xạ tên -> tiêu đề cột đẹp. Patch chỉ **thay thế** hàm nếu file đã có sẵn `colHeader` (bản Fastweb cũ đã tùy biến); với bản gốc hiện tại thì **bỏ qua** | tiêu đề cột = `at-name` nguyên văn. Vì project mẫu đã đặt `at-name` là nhãn đầy đủ nên `colHeader` gần như không đổi gì -> **không phụ thuộc vào tùy biến này** |
| 2b | Chữ tiếng Anh: tiêu đề bảng AlarmViewer/AlarmReporter, tooltip nút full screen (`Full screen` / `Exit full screen`), `aria-label`, chữ `Loading report…` | bản gốc: tooltip tiếng Việt (`Toàn màn hình (Full Screen)`), `Đang tải báo cáo…`; tiêu đề bảng alarm của bản gốc hiện đã là tiếng Anh giống hệt |
| 2b | SVG: ẩn thanh công cụ khi đang toàn màn hình + thêm handler Esc cho chế độ fallback | bản gốc **đã có** quy tắc ẩn nút/thanh công cụ và handler Esc (patch thành dư thừa, vô hại) |
| 2c | Chép thư viện Leaflet vào `AppTemplate\plugins\leaflet` nếu thiếu | bản gốc đã có trong source; `Index.cshtml` luôn nạp |
| 3 | HistoricalChart: nếu `at-table` của item đầu kết thúc bằng `_daily` -> khoảng mặc định 30 ngày; `_monthly` -> 400 ngày | **mặc định gốc: từ 00:00 hôm nay đến hiện tại** cho mọi biểu đồ. Trên máy không patch, biểu đồ bảng tổng hợp ngày/tháng mở ra chỉ có dữ liệu hôm nay, người dùng phải tự chọn khoảng |
| 4 | Site.css: `display:block; margin-bottom:20px` cho các component, bo góc 14px cho khung SVG | bản gốc không có khối này (SVG có sẵn `margin-bottom: 16px` từ JS; card có `mb-10px`) |
| 5 | Chép `ATSCADAWebConfig.xml` vào `AppConfig` | - |

Khác biệt còn lại giữa hai thư mục **không do patch** (bản gốc mới hơn bản chép trong project mẫu): router hủy request đọc cũ và cuộn lên đầu khi đổi trang; `AtscadaFetchService` quản lý AbortController riêng từng request; DateRangePicker có các khoảng chọn nhanh (Today, Yesterday, Last 7 days, Last 30 days, This month, Last month, Last 3 months, This year, Last year, Custom range); AlarmViewer bỏ cập nhật sau khi rời trang; Site.css gốc có quy tắc `.row > .row`. Views `Hls`, `User` chỉ có ở bản gốc. Các khác biệt này không đổi hợp đồng XML.

Kết luận: **mọi thẻ/thuộc tính XML trong tài liệu này là hành vi gốc**. Chỉ hai điểm hiển thị phụ thuộc patch: khoảng ngày mặc định của historical chart (`_daily`/`_monthly`) và khoảng cách/bo góc CSS.

### Chưa xác nhận được

1. DLL đang triển khai của project mẫu là bản build cũ hơn mã nguồn đã đọc. Tên thuộc tính XML đã xác nhận giống hệt; **logic bên trong** (Render, truy vấn SQL, quy tắc kiểm tra) mô tả theo mã nguồn, chưa dịch ngược DLL đang triển khai để đối chiếu.
2. Các component [SRC] chưa từng thấy chạy trong config thật: `atscada-card`, `atscada-button`, `atscada-time-picker`, `atscada-stream-camera`, `atscada-hyperlink-view`, `atscada-svgcontrolvalue-item`, và nhánh SVG `Status`+`Color`/`Text`, `Pulse`, `Vibrate`, `Translate`, `Blink`, Conveyor trên `<path>`. Chuỗi assembly của 5 component/view này suy ra từ namespace + tên lớp (cùng assembly, cùng version).
3. `Render()` của StreamCamera thiếu `>`; chưa biết trình duyệt xử lý ra sao trong thực tế.
4. Dịch vụ iWebService trả `Value`/`Status` gì cho tag Bad hoặc tag không tồn tại (rỗng, null hay giá trị cũ) - không có mã nguồn phía dịch vụ. Chỉ biết web so sánh với `'Good'`.
5. Font `MaterialIcons-Regular.ttf` đi kèm có đủ mọi tên icon hay không: không đọc được bảng ligature. Các tên đánh dấu [ES] ở A.8 nằm trong config đã triển khai; `manage_accounts` còn có trong `MaterialIconHelper.cs`.
6. `at-size` của Switch ngoài `default`, và `at-skin` của Slider ngoài `big`: giá trị được truyền thẳng cho thư viện, chưa thử.
7. TimePicker: định dạng giá trị ghi xuống 4 tag và cách hiển thị khi Bad (chưa đọc `atscada-time-picker-view.js`). Slider: phần hiển thị status chưa đọc hết.
8. Thẻ `<atscada-components />` tự đóng và chuỗi assembly sai gây lỗi nạp cả file: suy ra từ mã `CollectionSerializer.ReadXml`, chưa chạy thử.
9. Hỗ trợ SQL Server: có trong mã (`SqlDialect`, `SqlServerAccess`), chưa xem `providerName` nào kích hoạt và chưa có bằng chứng chạy thật.
10. Hiện tượng lệch series của historical chart khi một item không có dữ liệu: suy ra từ mã, chưa tái hiện.
11. `at-visible` trên `atscada-hyperlink-view` và hành vi `at-delay` thập phân: chưa thử.
