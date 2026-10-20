import React, { useRef, useState } from 'react';
import { Sale } from '../../types';
import { useApp } from '../../contexts/AppContext';
import { Printer, Download, X, CheckCircle2, FileText, Receipt } from 'lucide-react';
import { NeuButton } from '../common/NeuButton';
import jsPDF from 'jspdf';

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { settings, t, lang } = useApp();
  const [printFormat, setPrintFormat] = useState<'thermal_80' | 'thermal_58' | 'a4'>(
    settings.receiptFormat || 'thermal_80'
  );
  const receiptRef = useRef<HTMLDivElement>(null);

  // الطباعة المباشرة
  const handlePrint = () => {
    window.print();
  };

  // تصدير كـ PDF احترافي عبر jsPDF
  const handleDownloadPdf = () => {
    if (printFormat === 'a4') {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(settings.storeNameFr || 'FACTURE DE VENTE', 20, 22);

      doc.setFontSize(9);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Adresse: ${settings.address} - ${settings.wilaya}`, 20, 28);

      doc.setFont('Helvetica', 'bold');
      doc.text(`Facture N°: ${sale.invoiceNumber}`, 140, 22);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Date: ${new Date(sale.createdAt).toLocaleString('fr-FR')}`, 140, 28);
      doc.text(`Mode de paiement: ${sale.paymentMethod}`, 140, 34);

      doc.line(20, 40, 190, 40);

      // Table Header
      let y = 48;
      doc.setFont('Helvetica', 'bold');
      doc.text('Désignation', 20, y);
      doc.text('Qté', 110, y);
      doc.text('Prix Unit', 130, y);
      doc.text('Total (DZD)', 165, y);
      doc.line(20, y + 2, 190, y + 2);

      y += 8;
      doc.setFont('Helvetica', 'normal');
      sale.items.forEach((item) => {
        doc.text(item.productName.slice(0, 35), 20, y);
        doc.text(`${item.quantity}`, 110, y);
        doc.text(`${item.unitPrice}`, 130, y);
        doc.text(`${item.total}`, 165, y);
        y += 7;
      });

      doc.line(20, y + 2, 190, y + 2);
      y += 10;

      doc.setFont('Helvetica', 'bold');
      doc.text(`Sous-total: ${sale.subtotal} DZD`, 130, y);
      y += 6;
      if (sale.discount > 0) {
        doc.text(`Remise: -${sale.discount} DZD`, 130, y);
        y += 6;
      }
      if (sale.tvaRate > 0) {
        doc.text(`TVA (${sale.tvaRate}%): ${sale.tvaAmount} DZD`, 130, y);
        y += 6;
      }
      doc.setFontSize(13);
      doc.text(`NET A PAYER: ${sale.total} DZD`, 130, y + 2);

      doc.setFontSize(9);
      doc.setFont('Helvetica', 'normal');
      doc.text(settings.receiptFooterMessage || 'Merci pour votre confiance !', 20, y + 20);

      doc.save(`Facture-${sale.invoiceNumber}.pdf`);
    } else {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 160 + sale.items.length * 8],
      });

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(settings.storeNameFr || 'TAJIR Store', 40, 10, { align: 'center' });

      doc.setFontSize(8);
      doc.setFont('Helvetica', 'normal');
      doc.text(`${settings.address} - ${settings.wilaya}`, 40, 15, { align: 'center' });
      doc.text(`Ticket: ${sale.invoiceNumber}`, 40, 20, { align: 'center' });
      doc.text(`Date: ${new Date(sale.createdAt).toLocaleString('fr-FR')}`, 40, 24, { align: 'center' });

      doc.line(5, 27, 75, 27);

      let y = 32;
      sale.items.forEach((item) => {
        doc.setFont('Helvetica', 'bold');
        doc.text(item.productName.slice(0, 25), 5, y);
        doc.setFont('Helvetica', 'normal');
        doc.text(`${item.quantity} x ${item.unitPrice} DZD = ${item.total} DZD`, 5, y + 4);
        y += 8;
      });

      doc.line(5, y, 75, y);
      y += 5;

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`TOTAL TTC: ${sale.total} DZD`, 40, y, { align: 'center' });
      y += 6;

      doc.setFontSize(8);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Paye: ${sale.paidAmount} DZD | Rendu: ${sale.changeAmount} DZD`, 40, y, { align: 'center' });
      y += 5;
      doc.text(`Mode: ${sale.paymentMethod}`, 40, y, { align: 'center' });
      y += 7;

      doc.text(settings.receiptFooterMessage || 'Merci pour votre visite!', 40, y, { align: 'center' });

      doc.save(`Ticket-${sale.invoiceNumber}.pdf`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="neu-flat w-full max-w-xl rounded-3xl p-6 bg-white/95 my-8 shadow-2xl border border-white">
        {/* رأس النافذة */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
            <h2 className="text-lg font-bold text-slate-800">
              {lang === 'ar' ? 'تم تسجيل الفاتورة بنجاح' : 'Vente enregistrée avec succès'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl neu-raised flex items-center justify-center text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* محدد صيغة الطباعة (حراري 80 / 58 / A4) */}
        <div className="flex items-center justify-between gap-2 mt-4 p-1.5 rounded-xl neu-inset bg-slate-100/60">
          <span className="text-xs font-bold text-slate-500 ps-2">صيغة الفاتورة:</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPrintFormat('thermal_80')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                printFormat === 'thermal_80'
                  ? 'neu-pressed text-blue-600 bg-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              حراري 80mm
            </button>
            <button
              onClick={() => setPrintFormat('thermal_58')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                printFormat === 'thermal_58'
                  ? 'neu-pressed text-blue-600 bg-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              حراري 58mm
            </button>
            <button
              onClick={() => setPrintFormat('a4')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                printFormat === 'a4'
                  ? 'neu-pressed text-blue-600 bg-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              فاتورة A4
            </button>
          </div>
        </div>

        {/* المعاينة */}
        <div className="py-4 max-h-[60vh] overflow-y-auto">
          {printFormat === 'a4' ? (
            /* نموذج فاتورة A4 الرسمية */
            <div
              ref={receiptRef}
              className="bg-white p-6 rounded-xl border border-slate-300 font-sans text-xs text-slate-800 space-y-4 select-text shadow-sm"
            >
              <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                <div>
                  <h3 className="font-black text-lg text-slate-900">{settings.storeNameAr}</h3>
                  <div className="text-xs text-slate-600 font-semibold">{settings.storeNameFr}</div>
                  <div className="text-[11px] text-slate-500 mt-1">{settings.address} - {settings.wilaya}</div>
                </div>

                <div className="text-end bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-blue-600">فاتورة بيع رسمية</div>
                  <div className="text-sm font-extrabold text-slate-900 font-mono">{sale.invoiceNumber}</div>
                  <div className="text-[11px] text-slate-500">{new Date(sale.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              {/* جدول المنتجات A4 */}
              <table className="w-full text-xs text-start border border-slate-200">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="py-2 px-3 text-start">التعيين والمنتج</th>
                    <th className="py-2 px-3 text-center">الكمية</th>
                    <th className="py-2 px-3 text-end">سعر الوحدة</th>
                    <th className="py-2 px-3 text-end">المجموع (د.ج)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sale.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-semibold">{item.productName}</td>
                      <td className="py-2 px-3 text-center tabular-nums">{item.quantity}</td>
                      <td className="py-2 px-3 text-end tabular-nums">{item.unitPrice.toLocaleString()}</td>
                      <td className="py-2 px-3 text-end font-bold tabular-nums">{item.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* الإجمالي A4 */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex justify-between text-slate-600">
                    <span>المجموع الفرعي:</span>
                    <span className="tabular-nums font-bold">{sale.subtotal.toLocaleString()} د.ج</span>
                  </div>
                  {sale.discount > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>الخصم الممنوح:</span>
                      <span className="tabular-nums">-{sale.discount.toLocaleString()} د.ج</span>
                    </div>
                  )}
                  {sale.tvaRate > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>TVA ({sale.tvaRate}%):</span>
                      <span className="tabular-nums">{sale.tvaAmount.toLocaleString()} د.ج</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-blue-700 pt-1 border-t border-slate-300">
                    <span>الصافي للدفع TTC:</span>
                    <span className="tabular-nums">{sale.total.toLocaleString()} د.ج</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* نموذج الإيصال الحراري 80mm أو 58mm */
            <div
              ref={receiptRef}
              style={{ maxWidth: printFormat === 'thermal_58' ? '58mm' : '80mm' }}
              className="thermal-receipt bg-amber-50/50 p-4 rounded-xl border border-dashed border-slate-300 font-mono text-xs text-slate-800 space-y-2 select-text mx-auto"
            >
              {/* بيانات المحل الرسمية */}
              <div className="text-center pb-2 border-b border-slate-300 border-dashed">
                <h3 className="font-extrabold text-sm text-slate-900">{settings.storeNameAr}</h3>
                <div className="text-[11px] text-slate-600 font-sans">{settings.storeNameFr}</div>
                <div className="text-[10px] text-slate-500 mt-1">{settings.address} - {settings.wilaya}</div>
              </div>

              {/* تفاصيل التذكرة */}
              <div className="flex justify-between text-[11px] pt-1">
                <span>رقم الفاتورة:</span>
                <span className="font-bold">{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>التاريخ:</span>
                <span>{new Date(sale.createdAt).toLocaleString('fr-FR')}</span>
              </div>

              {/* جدول المنتجات */}
              <div className="border-t border-b border-dashed border-slate-300 py-1.5 my-2">
                <div className="grid grid-cols-12 text-[10px] font-bold pb-1 text-slate-500">
                  <span className="col-span-6">المنتج</span>
                  <span className="col-span-2 text-center">الكمية</span>
                  <span className="col-span-2 text-end">السعر</span>
                  <span className="col-span-2 text-end">المجموع</span>
                </div>
                {sale.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 text-[11px] py-0.5">
                    <span className="col-span-6 font-semibold line-clamp-1">{item.productName}</span>
                    <span className="col-span-2 text-center tabular-nums">{item.quantity}</span>
                    <span className="col-span-2 text-end tabular-nums">{item.unitPrice}</span>
                    <span className="col-span-2 text-end font-bold tabular-nums">{item.total}</span>
                  </div>
                ))}
              </div>

              {/* المجاميع */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span className="tabular-nums">{sale.subtotal} {t.currency}</span>
                </div>
                {sale.discount > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>الخصم:</span>
                    <span className="tabular-nums">-{sale.discount} {t.currency}</span>
                  </div>
                )}
                {sale.tvaRate > 0 && (
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>الضريبة TVA ({sale.tvaRate}%):</span>
                    <span className="tabular-nums">{sale.tvaAmount} {t.currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-extrabold pt-1 border-t border-slate-300 border-dashed text-blue-700">
                  <span>الصافي للدفع TTC:</span>
                  <span className="tabular-nums">{sale.total.toLocaleString()} {t.currency}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 pt-1">
                  <span>المبلغ المدفوع ({sale.paymentMethod}):</span>
                  <span className="tabular-nums">{sale.paidAmount.toLocaleString()} {t.currency}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>الباقي (الصرف):</span>
                  <span className="tabular-nums font-bold text-emerald-600">
                    {sale.changeAmount.toLocaleString()} {t.currency}
                  </span>
                </div>
              </div>

              {/* الباركود الرمزي ورسالة الختام */}
              <div className="text-center pt-3 text-[10px] text-slate-500 font-sans border-t border-slate-300 border-dashed space-y-1">
                <div className="font-mono text-[9px] tracking-widest text-slate-400">
                  * {sale.invoiceNumber} *
                </div>
                <p>{settings.receiptFooterMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* أزرار الإجراءات: طباعة وتصدير */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
          <NeuButton
            variant="primary"
            onClick={handlePrint}
            icon={<Printer className="w-4 h-4" />}
            className="flex-1"
          >
            {t.print}
          </NeuButton>

          <NeuButton
            variant="default"
            onClick={handleDownloadPdf}
            icon={<Download className="w-4 h-4" />}
            className="flex-1"
          >
            {t.exportPdf}
          </NeuButton>

          <NeuButton variant="default" onClick={onClose}>
            {t.close}
          </NeuButton>
        </div>
      </div>
    </div>
  );
};
