'use client';

import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className='landing'>
      <nav className='landing-nav'>
        <div className='landing-nav-brand'>
          <div className='landing-nav-logo'>R</div>
          <span className='landing-nav-name'>AI Router</span>
          <span className='landing-nav-tag'>v1.0</span>
        </div>
        <div className='landing-nav-actions'>
          <button
            className='btn btn-ghost'
            onClick={() => router.push('/login')}
          >
            管理后台
          </button>
          <button
            className='btn btn-primary'
            onClick={() =>
              document
                .getElementById('api-doc')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            API 文档
          </button>
        </div>
      </nav>

      <section className='landing-hero'>
        <h1>AI 模型智能中转站</h1>
        <p>
          兼容 OpenAI API 格式，一键接入 DeepSeek、智谱
          GLM、通义千问、MiniMax，支持多模型负载均衡与自动故障转移
        </p>
        <div className='landing-hero-actions'>
          <button
            className='btn btn-primary'
            onClick={() => router.push('/login')}
          >
            开始使用
          </button>
          <button
            className='btn'
            onClick={() =>
              document
                .getElementById('models')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            查看模型
          </button>
        </div>
      </section>

      <section id='models' className='landing-section'>
        <h2>支持的模型</h2>
        <p className='landing-section-subtitle'>
          接入四大国产旗舰模型，覆盖不同场景需求
        </p>
        <div className='model-grid'>
          <div className='model-card'>
            <div className='model-card-header'>
              <div className='model-card-icon'>🔮</div>
              <div>
                <h3>DeepSeek V4</h3>
                <p className='provider'>深度求索 · 旗舰模型</p>
              </div>
            </div>
            <div className='model-card-meta'>
              <div className='model-card-meta-row'>
                <span className='meta-label'>模型 ID</span>
                <code>deepseek-v4</code>
              </div>
              <div className='model-card-meta-row'>
                <span className='meta-label'>计费倍率</span>
                <span className='meta-value'>x1.0</span>
              </div>
              <div className='model-card-meta-row'>
                <span className='meta-label'>上下文窗口</span>
                <span className='meta-value'>1M tokens</span>
              </div>
            </div>
          </div>
          <div className='model-card'>
            <div className='model-card-header'>
              <div className='model-card-icon'>🧠</div>
              <div>
                <h3>智谱 GLM-5</h3>
                <p className='provider'>智谱 AI · 旗舰模型</p>
              </div>
            </div>
            <div className='model-card-meta'>
              <div className='model-card-meta-row'>
                <span className='meta-label'>模型 ID</span>
                <code>glm-5</code>
              </div>
              <div className='model-card-meta-row'>
                <span className='meta-label'>计费倍率</span>
                <span className='meta-value'>x1.2</span>
              </div>
              <div className='model-card-meta-row'>
                <span className='meta-label'>特色能力</span>
                <span className='meta-value'>思维链推理</span>
              </div>
            </div>
          </div>
          <div className='model-card'>
            <div className='model-card-header'>
              <div className='model-card-icon'>☁️</div>
              <div>
                <h3>通义千问 qwen-plus</h3>
                <p className='provider'>阿里云 · 增强模型</p>
              </div>
            </div>
            <div className='model-card-meta'>
              <div className='model-card-meta-row'>
                <span className='meta-label'>模型 ID</span>
                <code>qwen-plus</code>
              </div>
              <div className='model-card-meta-row'>
                <span className='meta-label'>计费倍率</span>
                <span className='meta-value'>x0.8</span>
              </div>
              <div className='model-card-meta-row'>
                <span className='meta-label'>特色能力</span>
                <span className='meta-value'>高性价比</span>
              </div>
            </div>
          </div>
          <div className='model-card'>
            <div className='model-card-header'>
              <div className='model-card-icon'>⚡</div>
              <div>
                <h3>MiniMax M1</h3>
                <p className='provider'>MiniMax · 旗舰模型</p>
              </div>
            </div>
            <div className='model-card-meta'>
              <div className='model-card-meta-row'>
                <span className='meta-label'>模型 ID</span>
                <code>minimax-m1</code>
              </div>
              <div className='model-card-meta-row'>
                <span className='meta-label'>计费倍率</span>
                <span className='meta-value'>x1.0</span>
              </div>
              <div className='model-card-meta-row'>
                <span className='meta-label'>特色能力</span>
                <span className='meta-value'>长文本生成</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className='feature-section'>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '72px 32px' }}>
          <h2>核心特性</h2>
          <p className='landing-section-subtitle'>开箱即用的企业级能力</p>
          <div className='feature-grid'>
            <div className='feature-item'>
              <div className='feature-icon'>🔌</div>
              <h3>OpenAI 兼容</h3>
              <p>
                完全兼容 OpenAI Chat Completions API，只需修改 base_url 和
                api_key 即可接入
              </p>
            </div>
            <div className='feature-item'>
              <div className='feature-icon'>⚖️</div>
              <h3>负载均衡</h3>
              <p>auto 模式自动选择可用渠道，请求失败自动重试到其他模型</p>
            </div>
            <div className='feature-item'>
              <div className='feature-icon'>🔑</div>
              <h3>Key 管理</h3>
              <p>独立 API Key 体系，支持余额控制和用量统计</p>
            </div>
            <div className='feature-item'>
              <div className='feature-icon'>📊</div>
              <h3>用量监控</h3>
              <p>实时记录 Token 消耗，可视化统计图表，精确计费</p>
            </div>
          </div>
        </div>
      </section>

      <section id='api-doc' className='landing-section'>
        <h2>快速接入</h2>
        <p className='landing-section-subtitle'>
          只需修改两行代码，即可将现有 OpenAI 应用无缝切换到 AI Router
        </p>

        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div className='code-label'>
            <span className='code-label-dot'></span>Python (OpenAI SDK)
          </div>
          <pre className='code-block'>{`from openai import OpenAI

client = OpenAI(
  base_url="http://localhost:3000/v1",
  api_key="sk-router-your-key"
)

response = client.chat.completions.create(
  model="deepseek-v4",  # 或 glm-5 / qwen-plus / minimax-m1 / auto
  messages=[{"role": "user", "content": "你好"}],
  stream=True
)`}</pre>

          <div className='code-label' style={{ marginTop: 28 }}>
            <span className='code-label-dot'></span>cURL
          </div>
          <pre className='code-block'>{`curl http://localhost:3000/v1/chat/completions \\
  -H "Authorization: Bearer sk-router-your-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'`}</pre>
        </div>
      </section>

      <footer className='landing-footer'>
        AI Router &copy; 2026 &middot; 兼容 OpenAI API 的多模型智能中转站
      </footer>
    </div>
  );
}
