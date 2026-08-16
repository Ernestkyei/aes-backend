import PDFDocument from 'pdfkit';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================================================
// GENERATE ADMISSION LETTER PDF
// ======================================================

export const generateAdmissionLetter = async function(applicationId, callback) {
  try {
    // Get application data
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        user: true,
        educationRecord: {
          include: { subjects: true }
        }
      }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== 'OFFERED') {
      throw new Error('Application has not been offered admission');
    }

    // Generate PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, '../../uploads/admission-letters');
    await fs.ensureDir(outputDir);

    const fileName = `admission-letter-${application.ref || application.id}.pdf`;
    const filePath = path.join(outputDir, fileName);

    // Pipe PDF to file
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // ======================================================
    // PDF CONTENT
    // ======================================================

    // Header with institution logo (if you have one)
    // doc.image('path/to/logo.png', 50, 45, { width: 100 });

    // Institution Name
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .fillColor('#1a237e')
      .text('UNIVERSITY OF GHANA', { align: 'center' })
      .moveDown(0.5);

    // Subtitle
    doc
      .fontSize(16)
      .font('Helvetica')
      .fillColor('#333333')
      .text('OFFICE OF THE REGISTRAR', { align: 'center' })
      .moveDown(0.5);

    // Line separator
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .strokeColor('#1a237e')
      .lineWidth(2)
      .stroke()
      .moveDown(1.5);

    // Title
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#1a237e')
      .text('ADMISSION LETTER', { align: 'center' })
      .moveDown(2);

    // Reference
    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('#333333')
      .text(`Ref: ${application.ref || application.id}`, { align: 'right' })
      .text(`Date: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, { align: 'right' })
      .moveDown(2);

    // Dear Applicant
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(`Dear ${application.firstName} ${application.lastName},`)
      .moveDown(1);

    // Letter Body
    doc
      .fontSize(12)
      .font('Helvetica')
      .text(
        `We are pleased to inform you that you have been offered admission to the ` +
        `<b>${application.programChoice}</b> program for the ` +
        `<b>${application.academicYear}</b> academic year.`,
        { align: 'justify' }
      )
      .moveDown(1);

    doc.text(
      `This offer is based on your academic qualifications and performance in the ` +
      `admission process. You have been selected among many qualified candidates.`,
      { align: 'justify' }
    )
    .moveDown(1);

    // Important Information
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Important Information')
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font('Helvetica')
      .text('1. Program Details:', { underline: true })
      .moveDown(0.3);

    const details = [
      `   • Program: ${application.programChoice}`,
      `   • Program Type: ${application.programType || 'Undergraduate'}`,
      `   • Academic Year: ${application.academicYear}`,
      `   • Duration: 4 Years (Full-Time)`,
    ];
    details.forEach(line => doc.text(line))
    .moveDown(0.5);

    doc
      .text('2. Registration Dates:')
      .moveDown(0.3);

    const dates = [
      `   • Registration Opens: ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
      `   • Registration Closes: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
      `   • Lectures Begin: ${new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
    ];
    dates.forEach(line => doc.text(line))
    .moveDown(0.5);

    doc
      .text('3. Required Documents:')
      .moveDown(0.3);

    const documents = [
      '   • WASSCE Certificate (Original)',
      '   • Birth Certificate',
      '   • National ID Card',
      '   • Passport Photographs (2 copies)',
      '   • Medical Report',
    ];
    documents.forEach(line => doc.text(line))
    .moveDown(1);

    // Academic Requirements
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Academic Requirements')
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font('Helvetica')
      .text(
        `You are required to have a minimum aggregate of ${application.wassceAggregate || '10'} ` +
        `in WASSCE with core subjects (Mathematics, English, and Integrated Science) and ` +
        `the required elective subjects.`
      )
      .moveDown(1);

    // Fee Information
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Fee Information')
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font('Helvetica')
      .text(
        `Tuition and other fees are payable at the beginning of each semester. ` +
        `Details of fees and payment instructions will be provided during registration.`
      )
      .moveDown(1);

    // Contact Information
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Contact Us')
      .moveDown(0.5);

    doc
      .fontSize(12)
      .font('Helvetica')
      .text('For further inquiries, please contact:')
      .moveDown(0.3);

    const contacts = [
      '   📞 Phone: +233 302 123 456',
      '   📧 Email: admissions@university.edu.gh',
      '   🌐 Website: www.university.edu.gh',
      '   📍 Address: P.O. Box 123, Legon, Accra, Ghana',
    ];
    contacts.forEach(line => doc.text(line))
    .moveDown(1);

    // Signature
    doc
      .fontSize(12)
      .text('Yours sincerely,')
      .moveDown(1.5);

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Prof. John Doe')
      .text('Registrar')
      .text('University of Ghana')
      .moveDown(0.5);

    // Footer
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text(
        'This is a computer-generated letter and does not require a signature.',
        { align: 'center' }
      )
      .moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor('#999999')
      .text(
        '© University of Ghana | All Rights Reserved',
        { align: 'center' }
      );

    // Finalize PDF
    doc.end();

    // Wait for file to be written
    await new Promise((resolve) => {
      writeStream.on('finish', resolve);
    });

    // Update application with PDF path
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        admissionLetterUrl: `/uploads/admission-letters/${fileName}`,
        decisionDate: new Date(),
      },
    });

    return maybeCallback(callback, null, {
      success: true,
      message: 'Admission letter generated successfully',
      filePath: `/uploads/admission-letters/${fileName}`,
      fileName: fileName,
    });

  } catch (err) {
    return maybeCallback(callback, err);
  }
};

// ======================================================
// GENERATE ADMISSION LETTER USING HTML/CSS (Alternative)
// ======================================================

export const generateAdmissionLetterHTML = async function(applicationId, callback) {
  try {
    // Get application data
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { user: true }
    });

    if (!application) {
      throw new Error('Application not found');
    }

    // HTML template for admission letter
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Admission Letter</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 50px;
            background: white;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #1a237e;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #1a237e;
            margin: 0;
          }
          .header h2 {
            color: #333;
            margin: 5px 0;
          }
          .title {
            text-align: center;
            font-size: 24px;
            color: #1a237e;
            margin: 30px 0;
          }
          .ref-date {
            text-align: right;
            margin: 10px 0;
          }
          .body-text {
            line-height: 1.8;
            margin: 20px 0;
          }
          .section {
            margin: 25px 0;
          }
          .section-title {
            font-weight: bold;
            font-size: 16px;
            color: #1a237e;
            margin: 15px 0 10px 0;
          }
          .signature {
            margin-top: 50px;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 40px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          .status-approved {
            color: green;
            font-weight: bold;
          }
          .list-item {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>UNIVERSITY OF GHANA</h1>
          <h2>OFFICE OF THE REGISTRAR</h2>
        </div>

        <div class="title">ADMISSION LETTER</div>

        <div class="ref-date">
          <p>Ref: ${application.ref || application.id}</p>
          <p>Date: ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
        </div>

        <div class="body-text">
          <p>Dear <strong>${application.firstName} ${application.lastName}</strong>,</p>
          
          <p>
            We are pleased to inform you that you have been offered admission to the 
            <strong>${application.programChoice}</strong> program for the 
            <strong>${application.academicYear}</strong> academic year.
          </p>

          <p>
            This offer is based on your academic qualifications and performance in the 
            admission process. You have been selected among many qualified candidates.
          </p>
        </div>

        <div class="section">
          <div class="section-title">Important Information</div>
          
          <p><strong>1. Program Details:</strong></p>
          <ul>
            <li>Program: ${application.programChoice}</li>
            <li>Program Type: ${application.programType || 'Undergraduate'}</li>
            <li>Academic Year: ${application.academicYear}</li>
            <li>Duration: 4 Years (Full-Time)</li>
          </ul>

          <p><strong>2. Registration Dates:</strong></p>
          <ul>
            <li>Registration Opens: ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}</li>
            <li>Registration Closes: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</li>
            <li>Lectures Begin: ${new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toLocaleDateString()}</li>
          </ul>

          <p><strong>3. Required Documents:</strong></p>
          <ul>
            <li>WASSCE Certificate (Original)</li>
            <li>Birth Certificate</li>
            <li>National ID Card</li>
            <li>Passport Photographs (2 copies)</li>
            <li>Medical Report</li>
          </ul>
        </div>

        <div class="section">
          <div class="section-title">Academic Requirements</div>
          <p>
            You are required to have a minimum aggregate of ${application.wassceAggregate || '10'} 
            in WASSCE with core subjects (Mathematics, English, and Integrated Science) and 
            the required elective subjects.
          </p>
        </div>

        <div class="section">
          <div class="section-title">Fee Information</div>
          <p>
            Tuition and other fees are payable at the beginning of each semester. 
            Details of fees and payment instructions will be provided during registration.
          </p>
        </div>

        <div class="section">
          <div class="section-title">Contact Us</div>
          <p>
            📞 Phone: +233 302 123 456<br>
            📧 Email: admissions@university.edu.gh<br>
            🌐 Website: www.university.edu.gh<br>
            📍 Address: P.O. Box 123, Legon, Accra, Ghana
          </p>
        </div>

        <div class="signature">
          <p>Yours sincerely,</p>
          <br><br><br>
          <p><strong>Prof. John Doe</strong></p>
          <p>Registrar</p>
          <p>University of Ghana</p>
        </div>

        <div class="footer">
          <p>This is a computer-generated letter and does not require a signature.</p>
          <p>© University of Ghana | All Rights Reserved</p>
        </div>
      </body>
      </html>
    `;

    // Save HTML file
    const outputDir = path.join(__dirname, '../../uploads/admission-letters');
    await fs.ensureDir(outputDir);

    const fileName = `admission-letter-${application.ref || application.id}.html`;
    const filePath = path.join(outputDir, fileName);

    await fs.writeFile(filePath, html);

    // Update application
    await prisma.application.update({
      where: { id: applicationId },
      data: {
        admissionLetterUrl: `/uploads/admission-letters/${fileName}`,
        decisionDate: new Date(),
      },
    });

    return maybeCallback(callback, null, {
      success: true,
      message: 'Admission letter generated successfully',
      filePath: `/uploads/admission-letters/${fileName}`,
      fileName: fileName,
    });

  } catch (err) {
    return maybeCallback(callback, err);
  }
};