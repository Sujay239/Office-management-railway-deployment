import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import db from './db/db';
import authRoutes from './routes/auth/auth';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import adminEmp from './routes/admin/adminEmp';
import manageAdmins from './routes/admin/manageAdmins';
import adminPayroll from './routes/admin/adminPayroll';
import AdminLeaves from './routes/admin/AdminLeavesManagement';
import adminSetting from './routes/admin/adminSetting';
import forgotPasswordRoutes from './routes/auth/ForgotPassword';
import announcementRoutes from './routes/admin/announcements';
import adminHolidays from './routes/admin/adminHolidays';
import dashboardRoutes from './routes/admin/dashboard';
import adminTasks from './routes/admin/adminTasks';
import meetingRoutes from './routes/admin/meetings';
import adminDepartments from './routes/admin/adminDepartments';
import auditLogsRoutes from './routes/superadmin/auditLogs';
import path from 'path';
import { fileURLToPath } from 'url';
import settings from './routes/employees/setting';
import empDashboardRoutes from './routes/employees/dashboard';
import clearTable from './scripts/clearTable';
import tasks from './routes/employees/tasks';
import notifications from './routes/admin/notifications';
import empNotification from "./routes/employees/Notification";
import attendance from "./routes/employees/attendance";
import payroll from "./routes/employees/payroll";
import Leaves from './routes/employees/Leaves';
import chatRoutes from './routes/chat';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { handleSocketConnection } from './controllers/chatController';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};



const app = express();
const port = 3000;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST']
  }
});

app.set('socketio', io);

// Socket.IO Middleware for Authentication
io.use((socket, next) => {
  const cookieHeader = socket.handshake.headers.cookie;
  if (!cookieHeader) {
    // If we want to allow unauthenticated connections for some reason? No.
    // But maybe for login page? No, only chat needs socket.
    return next(new Error('Authentication error: No cookies found'));
  }

  // Parse cookies manually
  const tokenMatch = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;

  if (!token) {
    return next(new Error('Authentication error: Token not found'));
  }

  jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
    socket.data.user = user;
    next();
  });
});


app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(cors(corsOptions));

// Force restart 11ic files from the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Schedule: 26th of every month at 00:00 (Midnight)
cron.schedule('0 0 26 * *', async () => {
  console.log('Running Monthly Payroll Generation Job...');
  try {
    await db.query('SELECT generate_monthly_payroll()');
    console.log('Monthly Payroll Generated Successfully.');
  } catch (err) {
    console.error('Error generating payroll:', err);
  }
});

// Authentication routes
app.use('/auth', authRoutes);
app.use('/auth', forgotPasswordRoutes);

//Super admin routes
app.use('/superadmin/departments', adminDepartments);
app.use('/superadmin/audit-logs', auditLogsRoutes);
app.use('/admin/departments', adminDepartments); // Add this for Employees.tsx

//All admin routes
app.use('/admin/emp', adminEmp);
app.use('/api/admins', manageAdmins);
app.use('/payroll', adminPayroll);
app.use('/admin/leaves', AdminLeaves);
app.use('/admin/settings', adminSetting);
app.use('/admin/announcements', announcementRoutes);
app.use('/admin/holidays', adminHolidays);
app.use('/admin/dashboard', dashboardRoutes);
app.use('/admin/tasks', adminTasks);
app.use('/admin/meetings', meetingRoutes);
app.use('/admin/notifications', notifications);



// All Employee routes
app.use('/settings', settings);
app.use('/employee/dashboard', empDashboardRoutes);
app.use('/employee/tasks', tasks);
app.use('/employee/notifications', empNotification);
app.use('/employee/attendance', attendance);
app.use('/employee/payroll', payroll);
app.use('/employee/leaves', Leaves);
app.use('/api/chats', chatRoutes);





//aLL NEEDED API TO CLEAR TABLES
app.use('/scripts', clearTable);


app.get('/health-check', (req, res) => {
  res.send('Backend is running!');
});


// Initialize Socket.IO
handleSocketConnection(io);

// Force restart 13

httpServer.listen(port, () => {
  console.log(`Backend running on : http://localhost:${port}`)
});
