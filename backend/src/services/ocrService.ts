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
      // 使用优化的Tesseract配置提高识别率
      const { data } = await Tesseract.recognize(imagePath, 'chi_sim+eng', {
        logger: m => console.log(m)
      });

      const text = data.text;
      let confidence = data.confidence;

      // 如果置信度太低，尝试不同的识别模式
      if (confidence < 60) {
        console.log('置信度较低，尝试其他识别模式...');
        const { data: data2 } = await Tesseract.recognize(imagePath, 'chi_sim+eng', {
          logger: m => console.log(m)
        });
        
        if (data2.confidence > confidence) {
          confidence = data2.confidence;
        }
      }

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
    // 清理行内容
    const cleanLine = line.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s¥.,()（）-]/g, ' ').trim();
    
    // 模式1: 商品名 单价 数量 总价
    const pattern1 = /(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+)\s+(\d+(?:\.\d+)?)/;
    const match1 = cleanLine.match(pattern1);
    if (match1) {
      const name = match1[1].trim();
      const unitPrice = parseFloat(match1[2]);
      const quantity = parseInt(match1[3]);
      const totalPrice = parseFloat(match1[4]);
      
      if (this.isValidItem(name, unitPrice, quantity, totalPrice)) {
        return { name, unitPrice, quantity, totalPrice };
      }
    }

    // 模式2: 商品名 价格 (可能包含¥符号)
    const pattern2 = /(.+?)\s*¥?\s*(\d+(?:\.\d+)?)/;
    const match2 = cleanLine.match(pattern2);
    if (match2) {
      const name = match2[1].trim();
      const price = parseFloat(match2[2]);
      
      // 检查前后行是否有数量信息
      let quantity = 1;
      const prevLine = currentIndex > 0 ? allLines[currentIndex - 1].trim() : '';
      const nextLine = currentIndex + 1 < allLines.length ? allLines[currentIndex + 1].trim() : '';
      
      const quantityPattern = /(?:数量|qty|x|×)\s*(\d+)/i;
      const prevQty = prevLine.match(quantityPattern);
      const nextQty = nextLine.match(quantityPattern);
      
      if (prevQty) quantity = parseInt(prevQty[1]);
      else if (nextQty) quantity = parseInt(nextQty[1]);
      
      if (this.isValidItem(name, price, quantity, price * quantity)) {
        return {
          name,
          unitPrice: price,
          quantity,
          totalPrice: price * quantity
        };
      }
    }

    // 模式3: 多行商品信息
    if (currentIndex + 1 < allLines.length) {
      const nextLine = allLines[currentIndex + 1].trim();
      const priceMatch = nextLine.match(/¥?(\d+(?:\.\d+)?)/);
      
      if (priceMatch && this.couldBeProductName(cleanLine)) {
        const name = cleanLine;
        const price = parseFloat(priceMatch[1]);
        
        if (this.isValidItem(name, price, 1, price)) {
          return {
            name,
            unitPrice: price,
            quantity: 1,
            totalPrice: price
          };
        }
      }
    }

    return null;
  }

  /**
   * 判断文本是否可能是商品名
   */
  private couldBeProductName(text: string): boolean {
    // 商品名通常包含中文或英文字母
    const hasValidChars = /[\u4e00-\u9fa5a-zA-Z]/.test(text);
    // 长度合理
    const reasonableLength = text.length >= 2 && text.length <= 50;
    // 不是纯数字
    const notOnlyNumbers = !/^\d+$/.test(text);
    
    return hasValidChars && reasonableLength && notOnlyNumbers;
  }

  /**
   * 判断是否为非商品行
   */
  private isNonItemLine(line: string): boolean {
    const nonItemPatterns = [
      /^(收据|发票|小票|receipt|购物清单)/i,
      /^(店名|商店|超市|便利店)/i,
      /^(地址|电话|tel|phone)/i,
      /^(日期|时间|date|time)/i,
      /^(收银员|cashier|营业员)/i,
      /^(合计|总计|小计|total|subtotal|应收|实收)/i,
      /^(找零|change|零钱)/i,
      /^(谢谢|thank|欢迎|welcome)/i,
      /^[-=*_]{3,}/,
      /^\d{4}[-/]\d{2}[-/]\d{2}/,
      /^\d{2}:\d{2}/,
      /^(会员|member|vip)/i,
      /^(积分|point)/i
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

    // 价格不能过高（防止识别错误）
    if (unitPrice > 10000 || totalPrice > 100000) {
      return false;
    }

    // 检查总价是否合理（允许一定的误差）
    const expectedTotal = unitPrice * quantity;
    const tolerance = Math.max(0.01, expectedTotal * 0.05); // 5%的误差或1分
    if (Math.abs(totalPrice - expectedTotal) > tolerance) {
      return false;
    }

    // 过滤明显不是商品的文本
    const invalidNames = ['小计', '合计', '总计', '找零', '收款', '应收', '实收', '优惠', '折扣'];
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
        /(?:合计|总计|total|应收|实收)\s*:?\s*¥?(\d+(?:\.\d+)?)/i,
        /¥(\d+(?:\.\d+)?)\s*(?:合计|总计|total)/i,
        /(?:总额|金额)\s*:?\s*¥?(\d+(?:\.\d+)?)/i
      ];

      for (const pattern of totalPatterns) {
        const match = line.match(pattern);
        if (match) {
          const amount = parseFloat(match[1]);
          // 验证总额是否合理
          if (amount > 0 && amount < 100000) {
            return amount;
          }
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