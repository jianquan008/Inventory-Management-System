import { OCRService } from '../src/services/ocrService';
import fs from 'fs';
import path from 'path';

// Mock Tesseract
jest.mock('tesseract.js', () => ({
  recognize: jest.fn()
}));

import Tesseract from 'tesseract.js';

describe('OCRService', () => {
  let ocrService: OCRService;
  const mockRecognize = Tesseract.recognize as jest.MockedFunction<typeof Tesseract.recognize>;

  beforeEach(() => {
    ocrService = OCRService.getInstance();
    jest.clearAllMocks();
  });

  describe('recognizeReceipt', () => {
    it('should recognize receipt text and parse items', async () => {
      const mockOCRText = `
        超市购物小票
        商品名称    单价   数量   总价
        苹果       5.00    2    10.00
        香蕉       3.50    3    10.50
        牛奶      12.00    1    12.00
        合计                   32.50
      `;

      mockRecognize.mockResolvedValue({
        data: {
          text: mockOCRText,
          confidence: 85
        }
      } as any);

      const result = await ocrService.recognizeReceipt('/fake/path/receipt.jpg');

      expect(result.text).toBe(mockOCRText);
      expect(result.confidence).toBe(85);
      expect(result.items).toHaveLength(3);
      expect(result.items[0]).toEqual({
        name: '苹果',
        unitPrice: 5.00,
        quantity: 2,
        totalPrice: 10.00
      });
    });

    it('should handle OCR recognition failure', async () => {
      mockRecognize.mockRejectedValue(new Error('OCR failed'));

      await expect(ocrService.recognizeReceipt('/fake/path/receipt.jpg'))
        .rejects.toThrow('OCR识别失败');
    });

    it('should parse different receipt formats', async () => {
      const mockOCRText = `
        便利店收据
        可乐 ¥3.5
        数量 x2
        面包 ¥8.0
        总计 ¥15.0
      `;

      mockRecognize.mockResolvedValue({
        data: {
          text: mockOCRText,
          confidence: 75
        }
      } as any);

      const result = await ocrService.recognizeReceipt('/fake/path/receipt.jpg');

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.totalAmount).toBe(15.0);
    });
  });

  describe('parseReceiptText', () => {
    it('should filter out non-item lines', () => {
      const text = `
        收据标题
        店铺地址：某某路123号
        电话：123-456-7890
        苹果 5.00 2 10.00
        谢谢惠顾
      `;

      // 使用私有方法测试（通过类型断言）
      const items = (ocrService as any).parseReceiptText(text);
      
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('苹果');
    });

    it('should validate item data', () => {
      const text = `
        商品A 0 1 0
        商品B -5 2 -10
        商品C 10 2 20
      `;

      const items = (ocrService as any).parseReceiptText(text);
      
      // 只有有效的商品应该被解析
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('商品C');
    });
  });

  describe('extractTotalAmount', () => {
    it('should extract total amount from receipt text', () => {
      const text = `
        商品1 10.00
        商品2 15.50
        合计: ¥25.50
      `;
      const items = [
        { name: '商品1', unitPrice: 10, quantity: 1, totalPrice: 10 },
        { name: '商品2', unitPrice: 15.5, quantity: 1, totalPrice: 15.5 }
      ];

      const total = (ocrService as any).extractTotalAmount(text, items);
      
      expect(total).toBe(25.50);
    });

    it('should calculate total from items if not found in text', () => {
      const text = '没有总计信息的收据';
      const items = [
        { name: '商品1', unitPrice: 10, quantity: 2, totalPrice: 20 },
        { name: '商品2', unitPrice: 5, quantity: 1, totalPrice: 5 }
      ];

      const total = (ocrService as any).extractTotalAmount(text, items);
      
      expect(total).toBe(25);
    });
  });

  describe('cleanupTempFile', () => {
    it('should remove existing file', () => {
      const tempFile = '/tmp/test-file.txt';
      
      // Mock fs.existsSync and fs.unlinkSync
      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      const unlinkSyncSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation();

      ocrService.cleanupTempFile(tempFile);

      expect(existsSyncSpy).toHaveBeenCalledWith(tempFile);
      expect(unlinkSyncSpy).toHaveBeenCalledWith(tempFile);

      existsSyncSpy.mockRestore();
      unlinkSyncSpy.mockRestore();
    });

    it('should handle non-existent file gracefully', () => {
      const tempFile = '/tmp/non-existent.txt';
      
      const existsSyncSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false);
      const unlinkSyncSpy = jest.spyOn(fs, 'unlinkSync').mockImplementation();

      ocrService.cleanupTempFile(tempFile);

      expect(existsSyncSpy).toHaveBeenCalledWith(tempFile);
      expect(unlinkSyncSpy).not.toHaveBeenCalled();

      existsSyncSpy.mockRestore();
      unlinkSyncSpy.mockRestore();
    });
  });
});