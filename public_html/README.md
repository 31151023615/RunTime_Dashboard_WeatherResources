# 📌 Project Setup Guide  

This guide provides step-by-step instructions for running the **backend** and **frontend** servers on the **Lehre server**.  

---

## 📂 Source Code Locations  
Currently, the source code is stored in two locations:  

1. **Lehre Server:**  
   - Path: `go29key/public_html`  
   - Recommended for starting servers, as the event stream is correctly set up here.  

2. **GitHub Repository:**  
   - Used for source code storage.  
   - Running locally **may not work as expected**, since the event stream is configured for the Lehre server, not `localhost`.  

---

## 🚀 How to Start the Servers on Lehre Server  

### **1️⃣ Start the Backend Server**  
1. Connect to Lehre server 
   ```sh
   ssh lehre
2. Navigate to the backend directory:  
   ```sh
   cd srv/gruppe/students/go29key/public_html/backend
3. Install required dependencies:
   ```sh
   npm install
4. Start the backend server:
   ```sh
   npm start
5. The server will be running on port 16067.
   
### **2️⃣ Start the Frontend Server** 
1. Open a new command window for starting another server
2. Connect to Lehre server 
   ```sh
   ssh lehre
3. Navigate to the frontend directory: 
   ```sh
   cd srv/gruppe/students/go29key/public_html/frontend
4. Install required dependencies:
   ```sh
   npm install
5. Build the frontend for production:
   ```sh
   npm run build
6. Start the frontend server:
   ```sh
   npx serve -s build -l 16068
7. The frontend server will be running on port 16068

---
### **📌 Notes**  
- Ensure you start the backend server before the frontend.
- The event stream does not work on localhost, so use the Lehre server for correct functionality
- If you encounter issues, check for missing dependencies using:
   ```sh
   npm install
 
### **🔗 Access the Dashboard**  
- Please follow the steps below to ensure the Dashboard retrieve a full event stream data
  1. Start backend server
  2. Start frontend server
  3. Open the Main dashboard: https://lehre.bpm.in.tum.de/ports/16068/dashboard
  4. Start CPEE Process at the directory: https://cpee.org/hub/?stage=development&dir=Teaching.dir/Prak.dir/TUM-Prak-24-WS.dir/Ngoc%20Nguyen.dir/
  5. Please do not refresh the Main Dashboard, it will refresh the data from state then the old event stream data will be disappeared

### **🔗 Important Links**  
- Main Dashboard Link: 👉 https://lehre.bpm.in.tum.de/ports/16068/dashboard
- History Instance Dashboard: 👉 https://lehre.bpm.in.tum.de/ports/16068/instance/instanceId
- Select Instance Page: 👉 https://lehre.bpm.in.tum.de/ports/16068/
- Document Link: 👉[Document Submission](https://www.figma.com/proto/NsB5TFKYjpAwpuyozIHYuX/CPEE?node-id=26-2&t=uxfQEw12SHPHWfLE-1&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1)

