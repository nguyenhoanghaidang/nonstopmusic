# Nhạc Liền

Trình phát nhạc cho Windows, chuyển bài liền mạch như đang nghe một danh sách thay vì từng bài rời. Phát nhạc trong máy hoặc dán link YouTube (bài hát, danh sách phát), ảnh bài hát làm nền khi đang chạy.

*English: a local music player with true crossfade, YouTube links and playlists (official embedded player), and the current cover as a blurred background. Node.js backend, no dependencies.*

## Bắt đầu nhanh

1. Cài [Node.js](https://nodejs.org) 18 trở lên (một lần duy nhất).
2. Giải nén dự án, bấm đúp `start.bat`. Trình duyệt tự mở `http://localhost:3000`.
3. Thêm nhạc: **Thêm file** / **Thêm thư mục** (nhạc trong máy), hoặc dán link vào ô **Thêm link**.

Muốn thêm cả danh sách phát YouTube, tạo khóa API (xem mục dưới) rồi bỏ chữ `rem` ở dòng `set YT_API_KEY=...` trong `start.bat`.

Bản chỉ phát nhạc trong máy vẫn mở được bằng cách bấm đúp `public/index.html`, nhưng phần YouTube cần chạy qua server.

## Dùng YouTube

- **Một bài:** dán link dạng `youtube.com/watch?v=...`, `youtu.be/...`, `/shorts/...`. Không cần khóa API.
- **Danh sách phát:** dán link có `list=...`. Cần `YT_API_KEY` (YouTube Data API v3, tạo miễn phí trong Google Cloud Console). Mỗi lần đọc tối đa 200 bài. Nếu link có cả `v=` và `list=` mà server chưa có khóa, app chỉ thêm bài đang chọn.
- Danh sách YouTube được **lưu lại** trong `data/library.json`, mở lần sau vẫn còn.
- App dùng **trình phát nhúng chính thức** của YouTube (hai khung 200×200 ở cột phải), không tải hay tách âm thanh. Vì vậy bài bị chủ video chặn nhúng sẽ không phát được, và quảng cáo của YouTube (nếu có) vẫn hiện như bình thường.
- Crossfade giữa hai bài YouTube hoạt động bằng cách đổi dần âm lượng của hai trình phát. Giữa bài trong máy và bài YouTube, mỗi bên vẫn đổi âm lượng riêng nên hòa vào nhau được, nhưng độ mượt phụ thuộc vào độ trễ khi YouTube nạp video.

## Tính năng

- **Chuyển bài liền mạch (crossfade).** Bài sau bắt đầu khi bài trước còn đoạn cuối, hai bài hòa vào nhau trong 0 đến 12 giây. Mặc định là 6 giây, kéo về 0 để tắt.
- **Ảnh bài hát làm nền.** Ảnh bìa (hoặc thumbnail YouTube) của bài đang chạy được làm mờ phía sau toàn bộ giao diện.
- **Hiệu ứng hai ảnh bìa.** Khi hai bài giao nhau, ảnh bìa bài cũ và bài mới nằm cạnh nhau, sau đó bài mới trượt vào giữa.
- **Đọc thẻ nhạc MP3.** Tên bài, nghệ sĩ và ảnh bìa lấy từ thẻ ID3. Không có thẻ thì dùng tên file, và app tự tạo ảnh bìa màu.
- **Thêm cả thư mục**, sắp theo tên file (số được xếp đúng thứ tự, ví dụ `2` trước `10`).
- **Ngẫu nhiên**, **lặp lại danh sách**, âm lượng và thanh tua.
- **Phím media** trên bàn phím và màn hình khóa (Media Session) hoạt động.
- **Giao diện sáng hoặc tối** theo cài đặt Windows.

## Phím tắt

| Phím | Chức năng |
| --- | --- |
| `Space` | Phát hoặc tạm dừng |
| `Ctrl` + `→` | Bài kế tiếp |
| `Ctrl` + `←` | Bài trước (hoặc về đầu bài nếu đã nghe quá 3 giây) |

Phím media (Play/Pause, Next, Previous) trên bàn phím cũng dùng được.

## Crossfade hoạt động thế nào

- Mỗi lần phát, app dùng **hai bộ phát âm thanh** luân phiên nhau, mỗi bộ có một nút chỉnh âm lượng riêng (Web Audio API).
- Khi thời gian còn lại của bài đang phát nhỏ hơn thời lượng crossfade, bài tiếp theo được nạp vào bộ phát còn lại và bắt đầu chạy.
- Âm lượng hai bài đổi theo đường cong **equal-power** (sin và cos), nên tổng độ lớn gần như không đổi và không bị tụt âm ở giữa chỗ giao.
- Bài ngắn hơn hai lần thời lượng crossfade thì crossfade tự rút xuống tối đa một nửa độ dài bài.
- Khi bấm **Sau**, app cũng chuyển mượt, tối đa 3 giây. Bấm chọn thẳng một bài trong danh sách thì chuyển ngay, không crossfade.

## Yêu cầu

- Windows 10 hoặc 11 với Edge hoặc Chrome bản mới. Trình duyệt khác chưa được kiểm tra, riêng nút **Thêm thư mục** cần trình duyệt nhân Chromium.
- Định dạng phát được phụ thuộc vào trình duyệt. Thường dùng được: MP3, M4A/AAC, FLAC, WAV, OGG, Opus. WMA thường không phát được.

## Hạn chế

- YouTube chỉ phát được khi chạy qua server và có mạng. Không có tính năng tải nhạc về.
- Tên bài, nghệ sĩ và ảnh bìa chỉ đọc được từ MP3 có thẻ ID3 phiên bản 2.3 hoặc 2.4. Định dạng khác vẫn phát bình thường nhưng dùng tên file.
- Nhạc trong máy **không được lưu** vào danh sách (trình duyệt không giữ đường dẫn file). Bài YouTube và cài đặt crossfade thì được lưu.
- Chưa có equalizer, lời bài hát hay tải nhạc.

## Xử lý sự cố

| Triệu chứng | Cách xử lý |
| --- | --- |
| Bấm Phát nhưng không có tiếng | Kiểm tra âm lượng của app và của Windows. Trình duyệt chỉ cho phát sau khi bạn bấm vào trang, nên hãy bấm một nút trước. |
| Bài không phát | Định dạng có thể không được trình duyệt hỗ trợ (ví dụ WMA). Thử chuyển sang MP3 hoặc FLAC. |
| Không có ảnh bìa | File phải là MP3 có ảnh nhúng trong thẻ ID3. Bìa màu là bìa mặc định, không phải lỗi. |
| Thêm thư mục không hoạt động | Dùng Edge hoặc Chrome, hoặc dùng **Thêm file** và chọn nhiều file cùng lúc. |
| Chuyển bài bị ngắt quãng | Một số file có đoạn im lặng dài ở cuối. Tăng thời lượng crossfade để lấp khoảng trống đó. |

## Quyền riêng tư

File nhạc trong máy không được tải lên đâu cả. Server mặc định chỉ nhận kết nối từ chính máy bạn (`127.0.0.1`). Khi dùng YouTube, server gọi YouTube để lấy tên bài, danh sách phát, và trình phát nhúng của YouTube tải dữ liệu theo chính sách của họ. Khóa API chỉ nằm trên server, không gửi xuống trình duyệt.

## Cấu trúc dự án

```
nhac-lien/
  server.js         backend Node.js, không cần cài thư viện
  start.bat         khởi động trên Windows
  package.json
  public/
    index.html      giao diện
    style.css       toàn bộ CSS
    app.js          trình phát, crossfade, YouTube
  data/             tự tạo, chứa library.json
```

API của backend:

| Đường dẫn | Chức năng |
| --- | --- |
| `GET /api/health` | Kiểm tra server và xem đã có `YT_API_KEY` chưa |
| `GET /api/oembed?url=` | Tên bài và kênh của một video YouTube |
| `GET /api/playlist?list=` | Các bài trong danh sách phát (cần `YT_API_KEY`) |
| `GET`, `PUT /api/library` | Đọc và lưu danh sách bài YouTube |

Biến môi trường: `PORT` (mặc định 3000), `HOST` (mặc định `127.0.0.1`), `YT_API_KEY`.

## Ghi chú về nguồn gốc

Ý tưởng chuyển bài liền mạch và hiệu ứng hai ảnh bìa lấy cảm hứng từ các tính năng của [SimpMusic](https://github.com/maxrave-dev/SimpMusic) (GPL-3.0) và bản mod của baotrq. Nhạc Liền được viết mới hoàn toàn, **không sao chép mã nguồn** của các dự án đó và không có liên hệ chính thức với họ. Khác với SimpMusic, Nhạc Liền không trích âm thanh từ YouTube Music mà chỉ nhúng trình phát chính thức của YouTube. Nếu bạn cần một client YouTube Music đầy đủ trên Windows, hãy dùng bản desktop của SimpMusic.

## Giấy phép

MIT. Bạn được dùng, sửa và chia sẻ tự do, kể cả cho mục đích thương mại, miễn giữ lại thông báo bản quyền.
