// import puppeteer from 'puppeteer';

// export const generatePdf = async (html: string): Promise<Buffer> => {
//     try {
//         const browser = await puppeteer.launch({
//             headless: true,
//             args: ['--no-sandbox', '--disable-setuid-sandbox'],
//         });
//         const page = await browser.newPage();

//         await page.setContent(html, {
//             waitUntil: 'networkidle0',
//         });

//         const pdfBuffer = await page.pdf({
//             format: 'A4',
//             printBackground: true,
//             // CHANGED: Margins set to 0 to allow the graphics to touch the edges (Full Bleed)
//             margin: {
//                 top: '0px',
//                 right: '0px',
//                 bottom: '0px',
//                 left: '0px',
//             },
//         });

//         await browser.close();

//         return Buffer.from(pdfBuffer);
//     } catch (error) {
//         console.error('Error generating PDF:', error);
//         throw error;
//     }
// };
