# Document To Document360 Migration App

A React-based web application that uploads a Microsoft Word document (`.docx`), converts it to clean HTML in the browser, and sends the generated HTML to **Document360** using the Article Creation API.


1. **Word Document Parsing**  
   The app uses the [`mammoth`](https://github.com/mrzmmr/mammoth) library to read `.docx` files directly in the browser. Mammoth extracts structured content — headings, paragraphs, bullet lists, numbered lists, tables, and hyperlinks — and converts them into semantic HTML while preserving the original document hierarchy.



## Programming Language & Tools

| Tool / Library                  
|----------------------
| **JavaScript (ES6+)**           
| **React 19**                    
| **mammoth.js**                    
| **Axios**                       
| **CSS (vanilla)**               

---

## Steps to Run the Application

## Prerequisites

- **Node.js** ≥ 16 and **npm** installed on your machine.
- A **Document360** API key (and optionally a User ID, Category ID, etc.).

 **Clone the Repository

git clone <repository-url>
cd migration-app

Steps to run the application
npm install
env
*Required
REACT_APP_API_URL=https://apihub.document360.io/v2/articles
REACT_APP_API_KEY=YOUR_API_KEY_HERE


 Start the Development Server
npm start
The app will open at **http://localhost:3000**

Project Structure

migration-app/
├── public/            # Static assets
├── src/
│   ├── App.js         # Root component
│   ├── App.css        # Root styles
│   ├── DocUpload.js   # Main upload & conversion component
│   ├── DocUpload.css  # Component styles (dark/light mode)
│   ├── index.js       # Entry point
│   └── index.css      # Global styles
├── .env.example       # Sample environment config
├── package.json       # Dependencies & scripts
└── README.md          # This file
