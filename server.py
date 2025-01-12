from flask import Flask, request, send_file
import os
import pandas as pd
from io import BytesIO
from werkzeug.utils import secure_filename
from docx import Document  # For extracting content from .docx files
from PyPDF2 import PdfReader  # For extracting content from .pdf files

app = Flask(__name__)

# Directory to store uploaded files
UPLOAD_FOLDER = 'uploaded_files'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Function to extract text from .docx files
def extract_docx_content(file):
    doc = Document(file)
    content = []
    for paragraph in doc.paragraphs:
        content.append(paragraph.text)
    return '\n'.join(content)

# Function to extract text from .pdf files
def extract_pdf_content(file):
    reader = PdfReader(file)
    content = []
    for page in reader.pages:
        content.append(page.extract_text())
    return '\n'.join(content)

# Function to convert files to CSV (handling different file types)
def convert_files_to_csv(files):
    csv_data = []
    for file in files:
        if file.filename.endswith('.docx'):
            # Extract content from Word file
            content = extract_docx_content(file)
            csv_data.append({'filename': file.filename, 'content': content})
        elif file.filename.endswith('.xlsx'):
            # Read and process Excel file
            df = pd.read_excel(file)
            csv_data.append({'filename': file.filename, 'content': df.to_csv(index=False)})
        elif file.filename.endswith('.pdf'):
            # Extract content from PDF file
            content = extract_pdf_content(file)
            csv_data.append({'filename': file.filename, 'content': content})
        else:
            # Unsupported file type
            csv_data.append({'filename': file.filename, 'content': 'Unsupported file type'})

    # Combine extracted data into a DataFrame and save as a CSV
    df = pd.DataFrame(csv_data)
    output = BytesIO()
    df.to_csv(output, index=False)
    output.seek(0)
    return output

@app.route('/convert/all', methods=['POST'])
def convert_all_files():
    files = request.files.getlist('files')  # Get list of uploaded files
    if not files:
        return "No files uploaded", 400

    # Convert the files to CSV format
    csv_output = convert_files_to_csv(files)

    # Return the CSV file as a response
    return send_file(
        csv_output,
        mimetype='text/csv',
        as_attachment=True,
        download_name='converted_files.csv'
    )

@app.route('/convert/filtered', methods=['POST'])
def convert_filtered_files():
    files = request.files.getlist('files')  # Get list of uploaded files
    if not files:
        return "No files uploaded", 400

    # Apply filters (if any) and convert files to CSV
    csv_output = convert_files_to_csv(files)

    # Return the filtered CSV file as a response
    return send_file(
        csv_output,
        mimetype='text/csv',
        as_attachment=True,
        download_name='filtered_files.csv'
    )

if __name__ == '__main__':
    app.run(debug=True)