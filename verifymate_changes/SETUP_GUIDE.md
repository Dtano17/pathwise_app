# PathWise.AI Setup Guide & Testing Instructions
# =============================================

## 🔐 Secure Credential Management

### 1. Create Your .env File
Create a `.env` file in your project root with these credentials:

```bash
# Database Configuration (GCP PostgreSQL)
DATABASE_URL=your_database_url_here

# AI Service API Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Session Configuration
SESSION_SECRET=your_secure_session_secret_here

# Server Configuration
NODE_ENV=development
PORT=5000
```

### 2. Security Best Practices
- ✅ **Never commit .env files** to version control
- ✅ **Use environment-specific secrets** for production
- ✅ **Rotate API keys regularly**
- ✅ **Use least-privilege access** for database users
- ✅ **Enable SSL/TLS** for all connections

## 🚀 Testing the Latest Features

### Step 1: Initialize Database
```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Step 2: Test Core Features

#### 🎯 AI Goal Processing
1. **Open**: http://localhost:5000
2. **Navigate to**: "Goal Input" tab
3. **Try these examples**:
   - "I want to get healthier and lose 10 pounds"
   - "Plan a weekend trip to Dallas"
   - "Learn React development"
   - "Organize my home office"

#### 📱 Task Management
1. **Complete tasks** by swiping right on task cards
2. **Skip tasks** by swiping left
3. **Watch celebrations** with confetti animations
4. **View progress** in the Progress tab

#### 🔄 Chat Import Feature
1. **Navigate to**: "Chat Sync" tab
2. **Paste a ChatGPT/Claude conversation** like:
   ```
   User: I want to start a fitness routine
   Assistant: That's great! Here's a plan to get started...
   User: What about meal prep?
   Assistant: Meal prep is essential for success...
   ```
3. **Click**: "Import & Create Tasks"
4. **Watch**: AI extracts goals and creates actionable tasks

#### 👥 Group Collaboration
1. **Navigate to**: "Groups" tab
2. **Create a new group** or join existing ones
3. **Share goals** with friends and family
4. **Track group progress** in real-time

### Step 3: Test Advanced Features

#### 📊 Progress Analytics
- **View streaks** and completion rates
- **Check category performance**
- **Get AI lifestyle suggestions**

#### 🎨 Theme Customization
- **Click**: "Set Daily Theme" button
- **Choose**: Health, Work, Romance, Adventure themes
- **Get**: Personalized goal suggestions

#### 📅 Smart Scheduling
- **Use**: "Plan a Date" feature
- **Get**: Location-based suggestions
- **Create**: Structured date plans

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Test database connection with your DATABASE_URL from .env
psql "your_database_url_here"
```

### API Key Issues
- **OpenAI**: Check API key format starts with `sk-proj-` or `sk-`
- **Anthropic**: Check API key format starts with `sk-ant-`
- **Rate Limits**: Both services have usage limits

### Common Errors
- **"DATABASE_URL not found"**: Ensure .env file exists
- **"Unauthorized"**: Check API keys are valid
- **"Connection refused"**: Verify database is running

## 🎉 What to Expect

### Successful Setup Should Show:
1. **Server running** on http://localhost:5000
2. **Database connected** (no connection errors)
3. **AI processing working** (goals turn into tasks)
4. **Celebrations working** (confetti on task completion)
5. **Real-time updates** (progress tracking)

### Latest Features to Test:
- ✅ **Voice input** with Web Speech API
- ✅ **Swipeable task cards** with animations
- ✅ **AI-powered goal breakdown** with OpenAI/Claude
- ✅ **Chat conversation import** and processing
- ✅ **Group collaboration** and sharing
- ✅ **Progress analytics** and insights
- ✅ **Theme-based planning** and suggestions
- ✅ **Contact integration** for sharing

## 🔒 Production Security Checklist

Before deploying to production:
- [ ] Change `SESSION_SECRET` to a strong random string
- [ ] Use production database credentials
- [ ] Set `NODE_ENV=production`
- [ ] Enable SSL/TLS for all connections
- [ ] Implement rate limiting
- [ ] Add monitoring and logging
- [ ] Set up backup strategies
- [ ] Configure CORS properly
- [ ] Use environment-specific API keys
- [ ] Implement proper error handling

## 📞 Support

If you encounter issues:
1. **Check console logs** for error messages
2. **Verify API keys** are correct and active
3. **Test database connection** independently
4. **Check network connectivity** to external services
5. **Review environment variables** are properly set

Happy testing! 🚀

