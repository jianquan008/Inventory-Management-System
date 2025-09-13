import Tesseract from 'tesseract.js';
import path from 'path';
import fs from 'fs';

export interface ReceiptItem {
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface OCRResult {
  text: string;
  items: ReceiptItem[];
  confidence: number;
  totalAmount?: number;
}

export class OCRService {
  private static instance: OCRService;

  private constructor() {}

  public static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  /**
   * 识别收据图片
   */
  public async recognizeReceipt(imagePath: string): Promise<OCRResult> {
    try {
      // 使用Tesseract进行OCR识别，支持中英文
      const { data } = await Tesseract.recognize(imagePath, 'chi_sim+eng', {
        logger: m => console.log(m) // 可选：显示识别进度
      });

      const text = data.text;
      const confidence = data.confidence;

      // 解析识别出的文本
      const items = this.parseReceiptText(text);
      const totalAmount = this.extractTotalAmount(text, items);

      return {
        text,
        items,
        confidence,
        totalAmount
      };
    } catch (error) {
      console.error('OCR识别失败:', error);
      throw new Error('OCR识别失败');
    }
  }

  /**
   * 预处理图片以提高OCR准确率
   */
  public async preprocessImage(inputPath: string): Promise<string> {
    // 这里可以添加图片预处理逻辑，如：
    // - 调整对比度和亮度
    // - 去噪
    // - 倾斜校正
    // 目前先返回原始路径
    return inputPath;
  }

  /**
   * 解析收据文本，提取商品信息
   */
  private parseReceiptText(text: string): ReceiptItem[] {
    const lines = text.split('\n').filter(line => line.trim());
    const items: ReceiptItem[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 跳过明显的非商品行
      if (this.isNonItemLine(line)) {
        continue;
      }

      // 尝试多种模式匹配商品信息
      const item = this.extractItemFromLine(line, lines, i);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * 从单行或多行中提取商品信息
   */
  private extractItemFromLine(line: string, allLines: string[], currentIndex: number): ReceiptItem | null {
    // 模式1: 商品名 单价 数量 总价 (一行包含所有信息)
    const pattern1 = /(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+)\s+(\d+(?:\.\d+)?)/;
    const match1 = line.match(pattern1);
    if (match1) {
      const name = match1[1].trim();
      const unitPrice = parseFloat(match1[2]);
      const quantity = parseInt(match1[3]);
      const totalPrice = parseFloat(match1[4]);
      
      if (this.isValidItem(name, unitPrice, quantity, totalPrice)) {
        return { name, unitPrice, quantity, totalPrice };
      }
    }

    // 模式2: 商品名和价格在同一行
    const pattern2 = /(.+?)\s+(\d+(?:\.\d+)?)/;
    const match2 = line.match(pattern2);
    if (match2) {
      const name = match2[1].trim();
      const price = parseFloat(match2[2]);
      
      // 检查下一行是否有数量信息
      const nextLine = currentIndex + 1 < allLines.length ? allLines[currentIndex + 1].trim() : '';
      const quantityMatch = nextLine.match(/(?:数量|qty|x)\s*(\d+)/i);
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
      
      if (this.isValidItem(name, price, quantity, price * quantity)) {
        return {
          name,
          unitPrice: price,
          quantity,
          totalPrice: price * quantity
        };
      }
    }

    // 模式3: 只有商品名和总价
    const pattern3 = /(.+?)\s+¥?(\d+(?:\.\d+)?)/;
    const match3 = line.match(pattern3);
    if (match3) {
      const name = match3[1].trim();
      const totalPrice = parseFloat(match3[2]);
      
      if (this.isValidItem(name, totalPrice, 1, totalPrice)) {
        return {
          name,
          unitPrice: totalPrice,
          quantity: 1,
          totalPrice
        };
      }
    }

    return null;
  }

  /**
   * 判断是否为非商品行
   */
  private isNonItemLine(line: string): boolean {
    const nonItemPatterns = [
      /^(收据|发票|小票|receipt)/i,
      /^(店名|商店|超市)/i,
      /^(地址|电话|tel)/i,
      /^(日期|时间|date|time)/i,
      /^(收银员|cashier)/i,
      /^(合计|总计|小计|total|subtotal)/i,
      /^(找零|change)/i,
      /^(谢谢|thank)/i,
      /^[-=*]{3,}/,
      /^\d{4}-\d{2}-\d{2}/,
      /^\d{2}:\d{2}/
    ];

    return nonItemPatterns.some(pattern => pattern.test(line));
  }

  /**
   * 验证商品信息是否有效
   */
  private isValidItem(name: string, unitPrice: number, quantity: number, totalPrice: number): boolean {
    // 商品名不能为空且长度合理
    if (!name || name.length < 1 || name.length > 100) {
      return false;
    }

    // 价格和数量必须为正数
    if (unitPrice <= 0 || quantity <= 0 || totalPrice <= 0) {
      return false;
    }

    // 检查总价是否合理（允许一定的误差）
    const expectedTotal = unitPrice * quantity;
    const tolerance = 0.01; // 1分的误差
    if (Math.abs(totalPrice - expectedTotal) > tolerance) {
      return false;
    }

    // 过滤明显不是商品的文本
    const invalidNames = ['小计', '合计', '总计', '找零', '收款', '应收'];
    if (invalidNames.some(invalid => name.includes(invalid))) {
      return false;
    }

    return true;
  }

  /**
   * 从文本中提取总金额
   */
  private extractTotalAmount(text: string, items: ReceiptItem[]): number {
    const lines = text.split('\n');
    
    // 查找包含总计的行
    for (const line of lines) {
      const totalPatterns = [
        /(?:合计|总计|total|应收)\s*:?\s*¥?(\d+(?:\.\d+)?)/i,
        /¥(\d+(?:\.\d+)?)\s*(?:合计|总计|total)/i
      ];

      for (const pattern of totalPatterns) {
        const match = line.match(pattern);
        if (match) {
          return parseFloat(match[1]);
        }
      }
    }

    // 如果没有找到总计，则计算所有商品的总价
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  }

  /**
   * 清理临时文件
   */
  public cleanupTempFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('清理临时文件失败:', error);
    }
  }
}