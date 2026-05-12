// 调试脚本：测试 MiniMax API 的不同请求方式

const API_KEY = 'sk-cp-vlTHZgIVasmnpeHS7LujRvGm12Ly8b8j3_HS6g__xEJ7ywYAUmzOj5jItHnmyBanAKSbX-xpInMBHZQmbw2sSEUlJucGDxM378VJMqSkpOhe9zNVUUW2xww'
const URL = 'https://api.minimaxi.com/v1/chat/completions'

const body = {
  model: 'MiniMax-M2.7',
  messages: [
    { role: 'system', name: 'MiniMax AI' },
    { role: 'user', content: '你好', name: '用户' }
  ]
}

async function testWithBearer() {
  console.log('=== Test 1: Authorization: Bearer <key> ===')
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  })
  console.log('Status:', res.status)
  console.log('Response:', await res.text())
  console.log()
}

async function testWithRawKey() {
  console.log('=== Test 2: Authorization: <raw key> ===')
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': API_KEY,
    },
    body: JSON.stringify(body),
  })
  console.log('Status:', res.status)
  console.log('Response:', await res.text())
  console.log()
}

async function testWithXApiKey() {
  console.log('=== Test 3: Authorization: Bearer <key> + x-api-key ===')
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'x-api-key': API_KEY,
    },
    body: JSON.stringify(body),
  })
  console.log('Status:', res.status)
  console.log('Response:', await res.text())
  console.log()
}

async function testSimpleBody() {
  console.log('=== Test 4: Simple body (no system msg, no name field) ===')
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'MiniMax-M2.7',
      messages: [{ role: 'user', content: 'hi' }],
      max_tokens: 5,
    }),
  })
  console.log('Status:', res.status)
  console.log('Response:', await res.text())
  console.log()
}

async function main() {
  await testWithBearer()
  await testWithRawKey()
  await testWithXApiKey()
  await testSimpleBody()
}

main().catch(console.error)
