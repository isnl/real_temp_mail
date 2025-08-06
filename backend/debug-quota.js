// 调试配额系统的脚本
const { DatabaseService } = require('./dist/modules/shared/database.service.js');

// 模拟 D1 数据库接口
const mockDB = {
  prepare: (sql) => ({
    bind: (...params) => ({
      first: async () => {
        console.log('SQL:', sql);
        console.log('Params:', params);
        return null; // 模拟返回
      },
      all: async () => ({
        results: []
      })
    })
  })
};

async function debugQuota() {
  const dbService = new DatabaseService(mockDB);
  
  console.log('=== 调试配额系统 ===');
  
  // 测试获取用户信息
  console.log('\n1. 测试获取用户信息:');
  try {
    await dbService.getUserById(1);
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  // 测试获取已使用配额
  console.log('\n2. 测试获取已使用配额:');
  try {
    await dbService.getUsedQuotaFromLogs(1);
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n=== 调试完成 ===');
}

debugQuota().catch(console.error);
