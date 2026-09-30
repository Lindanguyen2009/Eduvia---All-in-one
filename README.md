# 🪐 Eduvia - Không Gian Học Tập Thông Minh & Trạm Tâm Sự Vũ Trụ

Eduvia là nền tảng web ứng dụng học tập thông minh toàn diện dành cho học sinh THPT, tích hợp công nghệ AI sư phạm, ma trận thời gian Eisenhower và trạm tâm sự cảm xúc.

---

## ✨ Tính Năng Nổi Bật

1. **🤖 Gia Sư AI Học Thuật & Dashboard Siri Đồng Nhất:**
   - **Ghi nhớ ngữ cảnh đa lượt (Multi-turn Memory):** Tự động liên kết các câu hỏi tiếp nối (ví dụ: hỏi tiếp *"Thế còn ở sinh vật nhân thực thì sao?"*, *"Cho ví dụ"*, *"Tại sao lại như vậy?"*).
   - **Đồng bộ hóa 100%:** Trí tuệ AI trên Dashboard (`DashboardSiri`) và phòng học Gia Sư AI (`AITutor`) dùng chung bộ não, chia sẻ lịch sử trò chuyện và dữ liệu thời gian thực.
   - **Định tuyến chuẩn xác môn học THPT:** Phân biệt chính xác câu hỏi Toán, Lý, Hóa, Sinh, Anh, Văn, Sử, Địa; loại bỏ hoàn toàn các lỗi nhận diện nhầm (như câu điều kiện tiếng Anh với phản ứng este hóa, câu bị động với màng tế bào, thể tích hình học với thể tích khí hóa học).
   - **Phát âm song ngữ chuẩn Web Speech:** Tự động nhận diện tiếng Anh và tiếng Việt, đọc tách bạch các câu ví dụ tiếng Anh bằng giọng bản ngữ chuẩn, lọc bỏ emoji và ký tự markdown.
   - **Tính toán số học & Giải phương trình:** Xử lý chính xác phép tính số học, phần trăm và phương trình đại số.

2. **📋 Ma Trận Eisenhower & Quản Lý Thời Gian Chuẩn:**
   - Phân loại nhiệm vụ theo 4 góc phần tư (Khẩn cấp & Quan trọng).
   - Tự động tối ưu hóa lịch học, luôn bám sát thời gian thực tế của học sinh và tuyệt đối không bao giờ đề xuất giờ trong quá khứ.

3. **🎴 Thẻ Ghi Nhớ Flashcards Thông Minh:**
   - Sinh thẻ ghi nhớ động 1000 từ dựa trên việc tìm kiếm và tổng hợp kiến thức trực tuyến thời gian thực từ Wikipedia và DuckDuckGo.
   - Cung cấp khái niệm cốt lõi, công thức, cách dùng và ví dụ trực quan thay vì lời khuyên chung chung.

4. **⚔️ Đấu Trường Tri Thức (Study Battle Quiz):**
   - Bộ ngân hàng câu hỏi chuẩn THPT các môn Toán, Lý, Hóa, Sinh, Anh, Sử.
   - Thuật toán xáo trộn câu hỏi và đáp án Fisher-Yates ngẫu nhiên đều các lựa chọn A, B, C, D (loại bỏ hoàn toàn lỗi chọn toàn đáp án A).

5. **💬 Trạm Tâm Sự Cảm Xúc Vũ Trụ:**
   - Nơi chia sẻ áp lực thi cử ẩn danh và nhận lời khuyên động viên ấm áp.

6. **🎵 Không Gian Nhạc Lo-fi Học Tập:**
   - Bộ phát nhạc tích hợp trên thanh công cụ hỗ trợ tập trung tối đa khi làm bài.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Yêu cầu hệ thống:
- Đã cài đặt **Node.js** (phiên bản 18 trở lên).

### 2. Cài đặt các thư viện cần thiết:
```bash
npm install
```

### 3. Khởi chạy máy chủ:
```bash
npm start
```
Ứng dụng sẽ hoạt động tại địa chỉ: **`http://localhost:3000`**

### 4. (Tùy chọn) Cấu hình Google Gemini API Key:
- Tạo tệp `.env` tại thư mục gốc của dự án với nội dung:
  ```env
  GEMINI_API_KEY=your_gemini_api_key_here
  ```
- *Lưu ý:* Nếu không có API Key, hệ thống vẫn tự động kích hoạt **Bộ máy phản hồi thông minh chuẩn THPT** và **Tra cứu kiến thức trực tuyến thời gian thực** tích hợp sẵn.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
plannery/
├── index.html               # Giao diện chính hoàn chỉnh của ứng dụng
├── server.js                # Máy chủ Node.js backend xử lý API AI, Matrix, Search
├── package.json             # Danh sách dependencies và cấu hình dự án
├── apply_enhancements.js    # Script tự động hợp nhất các thành phần giao diện
├── src_enhancements/        # Các mô-đun phát triển mở rộng:
│   ├── styles.css           # Toàn bộ CSS phong cách Galaxy Pastel
│   ├── scripts.js          # Logic AI Tutor, Dashboard Siri, Audio, Timer
│   ├── dashboard_patch.html # Thành phần AI Lounge & Siri Orb
│   ├── flashcards_patch.html# Thành phần Flashcards 1000 từ
│   ├── modals_patch.html    # Hộp thoại Modal & Cài đặt API
│   ├── planner_patch.html   # Ma trận Eisenhower
│   ├── timer_patch.html     # Đồng hồ đếm ngược & Ước lượng AI
│   └── views_patch.html     # Khung Gia sư AI & Study Match
├── data/                    # Thư mục lưu trữ dữ liệu (confessions, etc.)
└── README.md                # Tài liệu hướng dẫn sử dụng
```

---

## 📜 Giấy Phép & Bản Quyền
Dự án được xây dựng và phát triển phục vụ học tập và nghiên cứu.
