// ======================== SECTION FUNCTIONS ========================

const axios = require('axios');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
require("dotenv").config();

function renderHeader(doc) {
    doc.fill('#0A0A0F').rect(0, 0, doc.page.width, 120).fill();

    doc.fill('#C89B3C').circle(40, 60, 25).fill()
        .fill('#0A0A0F').circle(40, 60, 20).fill()
        .fill('#C89B3C').circle(40, 60, 5).fill()

    doc.fill('#2A2A2A').rect(doc.page.width - 120, 30, 80, 60).fill();
    doc.fill('#C89B3C').rect(doc.page.width - 120, 30, 80, 15).fill();

    doc.fill('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(24).text('SATYAM ENTERTENTMENTS', 100, 45)
        .fontSize(12).text('Lights • Camera • Action!', 100, 75);
}

function renderDivider(doc) {
    doc.fill('#C89B3C').rect(0, 120, doc.page.width, 10).fill();
    doc.fill('#0A0A0F');
    for (let i = 30; i < doc.page.width; i += 40) {
        doc.circle(i, 125, 3).fill();
    }
}

function renderDetailsCard(doc, { name, content_type, episode_runtime, release_date, imdb_rating }) {
    const x = 40, y = 150, width = doc.page.width - 80, height = 100;

    doc.fill('#1A1A1F').roundedRect(x, y, width, height, 8).fill();
    doc.stroke('#C89B3C').lineWidth(1).roundedRect(x, y, width, height, 8).stroke();

    doc.fill('#FFFFFF').font('Helvetica-Bold').fontSize(16).text(name, x + 20, y + 20)
        .fontSize(12)
        .text(`Genre: ${content_type.toUpperCase()}`, x + 20, y + 45)
        .text(`Runtime: ${episode_runtime} mins`, x + 20, y + 65)
        .text(`Release Date: ${release_date}`, x + width / 2, y + 45)
        .text(`IMDb:  ${imdb_rating}/10`, x + width / 2, y + 65);
}

function renderChargesTable(doc, invoice) {
    const startY = 280;

    doc.fill('#C89B3C').fontSize(16).text('COSTS SUMMARY', 60, startY);

    doc.fill('#2A2A2A').rect(60, startY + 25, doc.page.width - 120, 25).fill();

    doc.fill('#C89B3C').font('Helvetica-Bold').fontSize(12)
        .text('ITEM DESCRIPTION', 70, startY + 30)
        .text('AMOUNT', 70, startY + 30, { align: 'right',width: doc.page.width - 140  });

    let currentY = startY + 55;

    invoice.chargeBreakdown.forEach((item, index) => {
        const bgColor = index % 2 === 0 ? '#1A1A1F' : '#242429';
        doc.fill(bgColor).rect(60, currentY - 10, doc.page.width - 120, 25).fill();

        doc.fill('#FFFFFF').fontSize(10)
            .text(item.label, 70, currentY)
            .text(`${item.amount}`, 70, currentY, {align: 'right',width: doc.page.width - 140 });

        currentY += 25;
    });

        doc.fill('#fadbca')
        .roundedRect(60, currentY, doc.page.width - 120, 30, 5)
        .fill();

    doc.fill('#0A0A0F').font('Helvetica-Bold').fontSize(18)
        .text('TOTAL', 80, currentY + 5)
        .text(`${invoice.subtotal}`, 70, currentY + 5, { align: 'right' ,width: doc.page.width - 160 });

    currentY+=30;
    doc.fill('#fadbca')
        .roundedRect(60, currentY, doc.page.width - 120, 30, 5)
        .fill();

    doc.fill('#0A0A0F').font('Helvetica-Bold').fontSize(18)
        .text('SMST', 80, currentY + 5)
        .text(`${invoice.smst}`, 70, currentY + 5, { align: 'right' ,width: doc.page.width - 160 });

    doc.fill('#C89B3C')
        .roundedRect(60, currentY + 35, doc.page.width - 120, 50, 5)
        .fill();

    doc.fill('#0A0A0F').font('Helvetica-Bold').fontSize(18)
        .text('GRAND TOTAL', 80, currentY + 50)
        .text(`${invoice.grandTotal}`,70, currentY + 50, { align: 'right' ,width: doc.page.width - 160  });
}

function renderFooter(doc) {
    doc.fill('#0A0A0F').rect(0, doc.page.height - 60, doc.page.width, 60).fill();

    doc.fill('#C89B3C').fontSize(10)
        .text('THANK YOU FOR CHOOSING OUR SERVICES', 0, doc.page.height - 40, {
            align: 'center',
            width: doc.page.width
        });

    doc.fill('#FFFFFF').fontSize(8)
        .text('Service by SATYAM ENTERTENTMENT', 0, doc.page.height - 20, {
            align: 'center',
            width: doc.page.width
        });
}

function renderBorder(doc) {
    doc.strokeColor('#C89B3C').lineWidth(2)
        .rect(0, 0, doc.page.width, doc.page.height)
        .stroke();
}

module.exports = {
    renderHeader,
    renderDivider,
    renderDetailsCard,
    renderChargesTable,
    renderFooter,
    renderBorder
};