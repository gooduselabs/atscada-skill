# Thiết kế giao diện: trang web, sơ đồ, màu, icon

Người vận hành nhìn màn hình cả ca. Mục tiêu: liếc qua biết chỗ nào bình thường, chỗ nào có vấn đề, và bấm một lần là tới chi tiết. Phong cách sơ đồ SVG do người dùng chọn (chuẩn SCADA nền tối hoặc sáng, dashboard hiện đại, minh hoạ có hình máy và nhà máy chuyển động, hoặc chuẩn riêng của nhà máy); bố cục kín và cân áp dụng cho mọi phong cách; bố cục trang web rút từ một project hoàn chỉnh. Áp dụng cho mọi project, trừ khi người dùng hoặc nhà máy có chuẩn riêng.

## Trình tự thiết kế

1. **Chốt trước khi vẽ**: danh sách đối tượng (máy, bồn, tủ, đồng hồ...), chỉ số của từng đối tượng, thứ bậc quan trọng (số nào phải thấy ngay, số nào chỉ cần ở trang chi tiết), nền tối hay sáng, ngôn ngữ hiển thị.
2. **Hỏi phong cách sơ đồ và quy ước màu trạng thái**, ghi vào `SVG_STYLE` và `C` trong `model.js`; dùng một phong cách cho cả project.
3. **Làm một khung mẫu trước** (một khung thiết bị trên sơ đồ, một trang chi tiết), render ra ảnh, soát khoảng trống và cân đối, cho người dùng xem, rồi mới nhân bản bằng vòng lặp.
4. **Soát theo danh sách ở cuối file** trước khi giao.

## Cấu trúc các trang

Thứ tự menu theo mức độ dùng. Một hệ điển hình:

| Trang | `at-location` | Icon menu | Nội dung |
|---|---|---|---|
| Tổng quan | `overview` | `dashboard` | sơ đồ toàn cảnh, thẻ chỉ số chính, biểu đồ tỉ trọng, bảng alarm mới nhất |
| Từng khu / nhà máy / tủ | tên khu | theo loại | sơ đồ của khu với mọi thiết bị, thẻ, biểu đồ, báo cáo năng lượng, ngưỡng của khu |
| Phụ trợ / năng lượng | `utilities` | `bolt` | sơ đồ một sợi, khí nén, nước |
| Lịch sử và so sánh | `history` | `timeline` | biểu đồ lịch sử so sánh nhiều đối tượng |
| Báo cáo | `reports` | `description` | **mọi** báo cáo và xuất Excel gom về một trang |
| Cảnh báo | `alarms` | `notifications` | alarm đang có + báo cáo lịch sử alarm |
| Cài đặt | `settings` | `settings` | cài đặt chung một nhóm, ngưỡng theo đối tượng một nhóm |
| Người dùng | `users` | `manage_accounts` | chỉ Admin, khi bật đăng nhập |
| Chi tiết từng thiết bị | `machine-xx` | bất kỳ | **ẩn khỏi menu**, mở bằng cách bấm thiết bị trên sơ đồ |

- Menu là danh sách phẳng, không có nhóm con: giữ dưới khoảng 10 mục, phần còn lại là trang ẩn.
- Trang nào cũng có đường về: nút điều hướng trong sơ đồ (về tổng quan, sang khu khác).
- Hỏi ngôn ngữ hiển thị từ đầu và dùng một ngôn ngữ cho cả web, kể cả chữ trong SVG.

## Cấu trúc trong một trang

Từ trên xuống, mỗi nhóm là một hàng (`W.full([...])`):

1. Sơ đồ SVG đầy chiều rộng (nếu trang có).
2. Thẻ chỉ số: quan trọng nhất trước. Thẻ có so sánh kỳ trước (card v3) cho đại lượng tức thời có log; thẻ cảnh báo (alarm card) cho đại lượng có ngưỡng; thẻ thường cho phần còn lại.
3. Điều khiển (công tắc, thanh trượt) nếu trang có, đặt cạnh thẻ của chính đại lượng đó.
4. Biểu đồ: **biểu đồ thời gian thực bên trái, biểu đồ lịch sử của cùng đại lượng bên phải**, cùng màu đường. Mỗi đại lượng một hàng.
5. Báo cáo (năng lượng theo kỳ, bảng dữ liệu chi tiết).
6. Ô nhập ngưỡng và cài đặt ở cuối trang.

Lưới: định trước số thẻ mỗi hàng ở màn lớn / vừa / nhỏ và dùng cùng một lớp cho các thẻ cùng hàng.

| Nội dung | Lớp (`W.G`) | Màn lớn / vừa / nhỏ |
|---|---|---|
| thẻ chỉ số gọn | `six` = `col-xl-2 col-lg-4 col-sm-6 col-12` | 6 / 3 / 2 / 1 |
| thẻ chỉ số chính | `four` = `col-xl-3 col-sm-6 col-12` | 4 / 2 / 1 |
| ba biểu đồ tròn/cột | `three` = `col-xl-4 col-sm-6 col-12` | 3 / 2 / 1 |
| cặp biểu đồ | `two` = `col-xl-6 col-12` | 2 / 1 |
| sơ đồ, bảng, báo cáo | `one` = `col-sm-12` | 1 |

Số thẻ trong một hàng nên chia hết cho số cột (4 hoặc 8 thẻ với `four`, 6 với `six`) để không lẻ hàng.

## Biểu đồ

- Mỗi biểu đồ có tiêu đề nêu đại lượng và đơn vị, nhãn trục Y là đơn vị, tối đa khoảng 3-4 đường (8 khi so sánh các máy cùng loại). Không trộn đại lượng khác đơn vị trên một trục.
- `line` cho diễn biến theo thời gian; `bar` để so sánh giá trị hiện tại giữa các đối tượng; `donut`/`pie` cho tỉ trọng (nguồn điện, phần đóng góp của từng khu). Đặt ba biểu đồ tỉ trọng/so sánh thành một hàng.
- Biểu đồ thời gian thực chỉ nhớ trong trình duyệt và mất khi rời trang; số điểm giữ lại x chu kỳ đọc của trang = cửa sổ thời gian (120 điểm x 1 giây = 2 phút). Diễn biến dài thì dùng biểu đồ lịch sử.
- `historical-bar` cho số liệu theo ngày/tháng; `historical-line` cho log chi tiết.
- Báo cáo năng lượng dùng cột số tích luỹ, tiêu đề nói rõ "theo giờ / ngày / tháng / năm".

## Sơ đồ SVG

### Chọn phong cách sơ đồ: hỏi người dùng

Phong cách sơ đồ là lựa chọn của người dùng, không cố định. **Hỏi trước khi vẽ**, kèm mô tả ngắn từng lựa chọn; nếu họ chưa có ý, đề xuất `scada-dark` và làm một khung mẫu cho họ xem ảnh rồi mới làm tiếp. Lựa chọn ghi vào `SVG_STYLE` trong `model.js`; mã vẽ trong `scenes.js` không đổi theo phong cách.

| `SVG_STYLE` | Trông thế nào | Hợp với |
|---|---|---|
| `scada-dark` | chuẩn màn hình SCADA (thông lệ ISA-101) trên nền xám đậm: khung vuông phẳng, số màu chữ trung tính, màu chỉ cho trạng thái và cảnh báo | phòng điều khiển, vận hành cả ca; mặc định đề xuất |
| `scada-light` | cùng chuẩn trên nền xám nhạt | phòng sáng, in ấn, khách quen màn hình SCADA truyền thống; đặt `at-dark-mode="false"` |
| `dashboard` | bảng điều khiển hiện đại nền xanh đậm: khung bo góc, mỗi đại lượng một màu nhấn (công suất, điện năng, dòng, áp, nhiệt...) | màn hình trình diễn, báo cáo cho quản lý, khách thích giao diện kiểu web |
| `illustrated` | minh hoạ sinh động: màu như `dashboard`, thêm **hình vẽ máy có bộ phận chuyển động khi máy chạy** và **khối nhà máy, bồn, sân bãi dạng phối cảnh** (`tools/lib/art.js`) | màn hình trình diễn ở sảnh, phòng họp, demo cho khách; người dùng muốn "nhìn thấy máy chạy" |
| chuẩn riêng | người dùng đưa bảng màu, ảnh mẫu hoặc file SVG của nhà máy | chọn phong cách gần nhất rồi ghi đè từng màu trong `C` của `model.js`; hình thức theo mẫu của họ |

Những điều cần hỏi cùng lúc: nền tối hay sáng; quy ước màu trạng thái của nhà máy (có nơi đỏ = đang chạy, xanh = dừng); thiết bị vẽ bằng **ký hiệu chuẩn** hay **hình minh hoạ máy có chuyển động**; có cần hình toàn cảnh nhà máy không; có mẫu màn hình sẵn để theo không.

Có thể kết hợp: trang tổng quan và trang từng xưởng vẽ kiểu `illustrated` cho sinh động, còn sơ đồ một sợi và sơ đồ công nghệ giữ ký hiệu chuẩn. Khi đó vẫn dùng một bảng màu cho cả project.

Trong mã vẽ, số liệu dùng `C.Q('power')`, `C.Q('energy')`, `C.Q('current')`, `C.Q('voltage')`, `C.Q('temp')`, `C.Q('flow')`, `C.Q('level')`: phong cách có màu nhấn thì trả về màu đó, phong cách SCADA thì trả về màu chữ trung tính. Nhờ vậy đổi `SVG_STYLE` là đổi được cả bộ sơ đồ mà không sửa mã.

### Nguyên tắc chung cho mọi phong cách

- Số liệu canh phải thẳng cột, có nhãn và đơn vị.
- Trạng thái = màu **và** chữ (RUNNING / STOPPED / FAULT). Màu trạng thái (chạy, dừng, sự cố, cảnh báo) không dùng cho việc khác.
- Cảnh báo là thứ nổi nhất màn hình: đỏ và nhấp nháy khi đang vượt ngưỡng, chìm hẳn khi bình thường. Không nhấp nháy thứ gì khác.
- **Chuyển động luôn mang nghĩa "đang chạy / đang có dòng"**: gắn với tag chạy, đứng yên khi máy dừng. Không có chuyển động nào chạy mãi chỉ để cho đẹp.
- Không dải màu chuyển trên nền và khung, không đổ bóng, không phát sáng, không lưới nền.
- Bố cục kín, cân, thẳng hàng (mục dưới).

### Riêng cho `scada-dark`, `scada-light`, `dashboard`

- Thiết bị là ký hiệu 2D chuẩn (`tools/lib/symbols.js`): bơm, van, động cơ, quạt, máy cắt, máy biến áp, bồn, điểm đo. Không hình máy tả thực, không phối cảnh 3D. Đường nối đi ngang và dọc, vuông góc.
- Chuyển động chỉ hai loại và dùng dè: nét đứt chạy báo có dòng chảy/dòng điện, dấu quay chậm trên bơm/quạt đang chạy.
- Hai phong cách SCADA: không tô mỗi đại lượng một màu; màn hình ở trạng thái bình thường gần như chỉ có xám và chữ.

### Riêng cho `illustrated`

Dùng `tools/lib/art.js`, lấy từ một project đã hoàn thiện:

- **Hình máy** `art.machineArt(s, loại, tiềnTốId, tagTrạngThái, tagChạy)`: 12 loại có sẵn (máy ép phun, thổi, nghiền, chiller, CNC, dập, robot hàn, buồng sơn, in, cắt, dán, đóng gói), mỗi hình vừa khung 300 x 150. Thân máy đổi màu theo trạng thái (xám dừng / xanh dương chạy / đỏ sự cố); các bộ phận (khuôn trượt, trục quay, cánh tay, băng tải, sản phẩm) chuyển động khi tag chạy = 1.
- **Máy loại khác** (bơm, quạt, lò, băng tải, máy trộn...): vẽ thêm theo đúng cách của các hình có sẵn: hình cơ bản (chữ nhật, tròn, đa giác), thân máy là một nhóm đổi màu, phần chuyển động bọc trong nhóm có class hoạt hình. Hỏi người dùng máy trông thế nào (hoặc xin ảnh) trước khi vẽ; không vẽ đại một hình không giống máy thật.
- **Toàn cảnh nhà máy** `art.iso(ox, oy, k)`: khối nhà, bồn trụ, sân bãi dạng phối cảnh trục đo. Mỗi khối là một vùng bấm sang trang của xưởng đó; cửa sổ sáng hoặc mái đổi màu theo trạng thái xưởng; đường nét đứt chạy giữa các khối khi có điện/có dòng. Vẽ từ sau ra trước để khối gần che khối xa.
- **Kiềm chế**: mỗi máy một hình, cỡ vừa; số liệu vẫn nằm trong khung phẳng bên cạnh hoặc bên dưới hình, không viết đè lên hình; hình toàn cảnh chỉ để định vị và cho thấy trạng thái, số liệu đặt ở các khung hai bên. Không thêm cây cối, mây, xe cộ, người để trang trí.
- Trang chi tiết một máy: phóng to hình bằng `transform="scale(2.6)"` bên trái, bảng số liệu bên phải.

### Bố cục: kín, cân, thẳng hàng

Khoảng trống lớn và khung lệch nhau là lỗi thẩm mỹ thường gặp nhất. Làm theo thứ tự:

1. **Đặt khung vẽ theo nội dung.** Không buộc 1920 x 1080. Ít thiết bị thì khung thấp (ví dụ 1600 x 676); nhiều thì cao hơn. Web co sơ đồ theo chiều rộng cột nên tỉ lệ nào cũng hiển thị được.
2. **Chia vùng cố định**: thanh tiêu đề cao 64 (tên bên trái, 2-6 chỉ số tổng bên phải), vùng thân, một dòng chân (nút điều hướng bên trái, chú giải bên phải).
3. **Lề và khoảng cách một cỡ**: lề ngoài 24, khoảng cách giữa các khung 16, lề trong khung 20. Dùng đúng các số này ở mọi sơ đồ của project.
4. **Các khung lấp đầy vùng thân** bằng `grid(n, vùng, {cols})`: khung cùng hàng cùng chiều cao, cùng chiều rộng (trừ khi cố ý chia tỉ lệ, ví dụ sơ đồ 1 phần, số liệu 2 phần). Không để khung kích thước cố định nổi giữa nền.
5. **Chọn số cột theo số thiết bị** để hàng cuối không lẻ: 2, 3, 4 thiết bị một hàng; 6 chia 3 x 2; 8 chia 4 x 2; 9 chia 3 x 3; 12 chia 4 x 3. Lẻ thì cho khung tổng hợp chiếm ô còn lại.
6. **Trong khung, nội dung trải đều chiều cao**: số chính ở trên, bảng số phụ ở giữa, giới hạn/ghi chú ở dưới, ngăn bằng đường kẻ mảnh. Khung còn thừa hơn một phần tư chiều cao thì giảm chiều cao khung vẽ hoặc thêm thông tin có ích (giới hạn cảnh báo, giờ chạy, thời điểm cập nhật), không thêm hình trang trí.
7. **Thẳng hàng**: mọi nhãn cùng mép trái, mọi số cùng mép phải trong một cột, đơn vị cách số một khoảng cố định.

`gen.js` cảnh báo khi các khung phủ dưới 70 % khung vẽ. Sau đó vẫn phải nhìn ảnh xem thử: tìm mảng nền trống rộng hơn một khung, và khung nào nội dung dồn về một góc.

### Cỡ chữ

Tiêu đề sơ đồ 22 đậm; tên khung 15 đậm; số chính của khung 36-48; số phụ 18-22; nhãn 13-14; ghi chú và chú giải 12-13. Một sơ đồ dùng không quá bốn cỡ chữ.

### Các loại sơ đồ

- **Một sợi (điện)**: nguồn ở trên, thanh cái nằm ngang, các lộ ra bên dưới; máy cắt là ô vuông tô theo trạng thái đóng/cắt; công suất ghi cạnh điểm đo; khung số liệu chi tiết đặt bên cạnh sơ đồ.
- **Công nghệ / P&ID (bơm, bồn, ống)**: dòng chảy từ trái sang phải; bồn có thanh mức bên trong; số liệu đặt sát thiết bị của nó; ống là đường xám, chỉ đổi màu hoặc chạy nét đứt khi cần báo có dòng.
- **Dãy thiết bị cùng loại (máy, tủ, đồng hồ)**: lưới các khung bằng nhau, mỗi khung gồm ký hiệu + trạng thái + 3-6 số; cả khung là vùng bấm sang trang chi tiết.
- **Trang chi tiết một thiết bị**: khung vẽ thấp; ký hiệu và trạng thái bên trái, bảng số liệu bên phải, giới hạn cảnh báo bên dưới.

Mỗi sơ đồ có dòng chân với chú giải những màu đang dùng và gợi ý thao tác ("Click a panel for details"). Phần nào chỉ là minh hoạ, không đo thật, thì ghi rõ.

## Màu

**Trong sơ đồ SVG**, bảng màu đi theo phong cách đã chọn (`SVG_STYLE`) và nằm ở `C` trong `model.js`; vai trò của từng khoá giống nhau ở mọi phong cách. Bảng dưới là giá trị của `scada-dark`:

| Vai trò | Khoá | Màu | Dùng cho |
|---|---|---|---|
| nền / khung / thanh tên | `bg`, `panel`, `panel2` | `#1b1f24`, `#242a31`, `#2c333b` | nền phẳng |
| viền, đường kẻ | `line` | `#48515c` | |
| chữ chính / phụ / mờ | `text`, `sub`, `mute` | `#e6e9ec`, `#9aa4af`, `#6b7682` | số liệu, nhãn, ghi chú |
| ống, dây | `pipe` | `#7d8894` | đường nối |
| đang chạy / bật | `run` | `#3fb950` | chỉ cho trạng thái |
| dừng / tắt | `stop` | `#8b949e` | chỉ cho trạng thái |
| sự cố, cảnh báo mức cao | `fault` | `#e5484d` | trạng thái lỗi, vượt ngưỡng |
| cảnh báo mức thấp hơn | `warn` | `#f5a524` | gần ngưỡng, bất thường |
| bấm được | `link` | `#58a6ff` | chữ nút, viền khi rê chuột |

- `scada-light` dùng cùng các khoá với màu cho nền xám nhạt; `dashboard` và `illustrated` thêm bán kính bo góc và màu nhấn cho từng đại lượng (`C.q`). Nền khung SVG (`at-color`) tự lấy theo `C.bg`.
- Theo chuẩn riêng của nhà máy: ghi đè từng khoá trong `C` (ví dụ `run`, `stop`, `fault`, `bg`), không sửa thư viện.
- **Hỏi quy ước màu trạng thái của nhà máy.** Mặc định ở đây là xanh = chạy, xám = dừng, đỏ = sự cố. Có nơi dùng đỏ = đang chạy/đang có điện, xanh = dừng/an toàn; khi đó đổi `run`/`stop`/`fault` trong `model.js`, và luôn in chú giải ở chân sơ đồ.
- Màu trạng thái không dùng cho thứ gì khác: không tiêu đề đỏ, không số xanh lá để trang trí.
- Ở phong cách SCADA không thêm màu cho từng đại lượng; phân biệt pha L1/L2/L3 hay các lộ bằng nhãn chữ. Ở `dashboard` và `illustrated`, mỗi đại lượng giữ một màu nhấn cố định ở mọi sơ đồ.

**Trên trang web (thẻ, biểu đồ)**:

- Biểu đồ nhiều đường cần màu để phân biệt: dùng dãy `C.pal` (8 màu), cố định một màu cho mỗi đối tượng ở mọi trang. Pha L1/L2/L3 dùng `C.L1`, `C.L2`, `C.L3`.
- Thẻ chỉ số có nền màu đặc, chữ trắng: dùng ít màu, tông đậm và dịu, theo nhóm chứ không mỗi thẻ một màu. Gợi ý: số liệu điện `#1d6fb8`, số liệu công nghệ (nhiệt, áp, mức, lưu lượng) `#0e7490`, sản lượng/đếm `#475569`, trạng thái tốt `#0f8a5f`. Thẻ cảnh báo (alarm card) chuyển `#e5484d` khi vượt ngưỡng.
- Chữ và nền đủ tương phản (chữ thường khoảng 4,5:1 trở lên).

## Icon

Hai hệ icon, không lẫn với nhau:

- **Menu (view)**: tên Material Icons, chữ thường có gạch dưới: `dashboard`, `bolt`, `timeline`, `description`, `notifications`, `settings`, `manage_accounts`, `memory`, `speed`, `thermostat`, `opacity`, `assessment`, `bar_chart`, `map`, `eco`, `precision_manufacturing`.
- **Thẻ (card)**: lớp Font Awesome **5** (không phải tên của bản 6): `fa fa-<tên> fa-fw`.

| Loại dữ liệu | Icon thẻ | Loại dữ liệu | Icon thẻ |
|---|---|---|---|
| Công suất | `fa-bolt` | Mức bồn, nước | `fa-water` |
| Điện năng, nguồn lưới | `fa-plug` | Lưu lượng khí | `fa-wind` |
| Dòng điện | `fa-wave-square` | Số máy chạy | `fa-cogs` |
| Điện áp | `fa-bolt` hoặc `fa-plug` | Sản lượng | `fa-cubes` |
| Hệ số công suất, tỉ lệ | `fa-percentage` | Theo ngày | `fa-calendar-day` |
| Tải, áp suất | `fa-tachometer-alt` | Chi phí | `fa-coins` |
| Nhiệt độ | `fa-thermometer-half` | Sự cố, cảnh báo | `fa-exclamation-triangle` |
| Điện mặt trời | `fa-solar-panel` | Môi trường, CO2 | `fa-leaf` |
| Nhà máy, khu | `fa-industry` | Điểm số, xếp hạng | `fa-award` |

Icon cùng nghĩa dùng cùng một hình ở mọi trang. Tên chưa có trong bảng và trong danh sách ở `references/web-components.md` (mục A.8) thì báo người dùng kiểm tra trên trình duyệt.

## Chữ

- Tiêu đề thẻ và biểu đồ theo một kiểu: `Tên chỉ số (đơn vị)`, ví dụ `Power (kW)`, `Điện áp L1 (V)`. Tiêu đề trang chi tiết: `Khu · Thiết bị`.
- Tên hiển thị tách khỏi tên kỹ thuật. Chỉ phần hiển thị (tiêu đề, chữ tĩnh trong SVG) là có dấu; tên tag, `at-location`, tên bảng, tên cột luôn không dấu. Nhãn cột báo cáo (`COL_HEADER`) chỉ ASCII: viết `degC`, `m3`, `CO2`.
- Không dùng dấu nháy kép trong tiêu đề.

## Danh sách soát trước khi giao giao diện

- Ảnh xem thử của mọi sơ đồ: không mảng nền trống lớn, lề và khoảng cách đều, khung cùng hàng bằng nhau, số thẳng cột, không chữ chồng hay tràn khung, có chú giải.
- Sơ đồ đúng phong cách người dùng đã chọn; mọi chuyển động gắn với tag chạy (thử tag = 0: phải đứng yên). Với phong cách SCADA: trạng thái bình thường gần như chỉ có xám và chữ.
- Mọi số trên sơ đồ có nhãn và đơn vị.
- Trạng thái đổi đúng theo tag: thử 0, 1, 2 (và giá trị ngoài ngưỡng với màu nhiều mức).
- Màu trạng thái đúng quy ước đã chốt và có chú giải; trên trang web, cùng một đối tượng cùng một màu đường và một icon ở mọi trang.
- Trang ẩn vào được từ sơ đồ, và có đường quay về.
- Menu đúng thứ tự, báo cáo nằm một chỗ, cài đặt chia nhóm rõ.
- Lưới không lẻ hàng ở màn lớn và không vỡ ở màn nhỏ.

Phần nào chưa xem được trên trình duyệt thì nói rõ để người dùng tự kiểm tra các mục trên.
