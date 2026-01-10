-- =============================================
-- 1. ENUMERATIONS (Updated for Scaling)
-- =============================================
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'hr', 'manager', 'employee');
CREATE TYPE user_status AS ENUM ('Active', 'On Leave', 'Past', 'Probation', 'Terminated', 'Suspended');
CREATE TYPE employment_type AS ENUM ('Full Time', 'Part Time', 'Contract', 'Intern', 'Remote');
CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Half Day', 'On Leave', 'Late');
CREATE TYPE leave_type AS ENUM ('Sick', 'Casual', 'Privilege', 'Maternity', 'Paternity', 'Unpaid');
CREATE TYPE leave_status AS ENUM ('Pending', 'Approved', 'Rejected', 'Cancelled');
CREATE TYPE payroll_status AS ENUM ('paid', 'processing', 'pending', 'failed');
CREATE TYPE task_priority AS ENUM ('Critical', 'High', 'Medium', 'Low');
CREATE TYPE task_status AS ENUM ('Pending', 'In Progress', 'In Review', 'Completed', 'Blocked');
CREATE TYPE chat_type AS ENUM ('direct', 'group', 'space', 'announcement');
CREATE TYPE message_sender_type AS ENUM ('user', 'system', 'bot');
CREATE TYPE attachment_type AS ENUM ('image', 'file', 'video', 'audio');
CREATE TYPE notification_type AS ENUM ('success', 'error', 'info', 'warning', 'reminder');

-- =============================================
-- 2. DEPARTMENTS (New - for Organizational Scaling)
-- =============================================
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    manager_id INT, -- FK added later to avoid circular dependency
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 3. USERS TABLE (Core)
-- =============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'employee',
    designation VARCHAR(100),
    status user_status DEFAULT 'Active',
    phone VARCHAR(20),
    location VARCHAR(100),
    bio TEXT DEFAULT NULL,
    joining_date DATE DEFAULT CURRENT_DATE,
    salary NUMERIC(15, 2) DEFAULT 0,
    skills TEXT[],
    employment_type employment_type DEFAULT 'Full Time',
    avatar_url TEXT,
    reset_password_token VARCHAR(255) DEFAULT NULL,
    reset_password_expires TIMESTAMP DEFAULT NULL,
    two_factor_secret VARCHAR(255) DEFAULT NULL,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add the Circular FK constraint for Departments now that Users exists
ALTER TABLE departments
ADD CONSTRAINT fk_dept_manager
FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- =============================================
-- 4. ATTENDANCE & LEAVES
-- =============================================
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status attendance_status NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    check_in_ip VARCHAR(45),
    check_out_ip VARCHAR(45),
    work_hours NUMERIC(4, 2), -- Calculated hours worked
    remarks TEXT, -- Late reason, etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

CREATE TABLE leaves (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    approved_by INT REFERENCES users(id) ON DELETE SET NULL, -- HR or Manager
    type leave_type NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(4, 1),
    reason TEXT,
    rejection_reason TEXT,
    status leave_status DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 5. PAYROLL (Finance)
-- =============================================
CREATE TABLE payroll (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    month VARCHAR(50) NOT NULL, -- Format: "January 2026"
    payment_date DATE DEFAULT NULL,
    transaction_id VARCHAR(100), -- Bank reference
    basic_salary NUMERIC(12, 2) NOT NULL,
    allowances NUMERIC(12, 2) DEFAULT 0,
    deductions NUMERIC(12, 2) DEFAULT 0,
    bonus NUMERIC(12, 2) DEFAULT 0,
    tax NUMERIC(12, 2) DEFAULT 0,
    net_salary NUMERIC(12, 2) NOT NULL,
    status payroll_status DEFAULT 'pending',
    generated_by INT REFERENCES users(id) ON DELETE SET NULL, -- Admin/HR who ran payroll
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 6. TASKS & PROJECTS
-- =============================================
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    project_name VARCHAR(100),
    description TEXT,
    priority task_priority DEFAULT 'Medium',
    status task_status DEFAULT 'Pending',
    start_date DATE,
    due_date DATE,
    assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    completion_percentage INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 7. COMMUNICATION (Chats)
-- =============================================
CREATE TABLE chats (
    id SERIAL PRIMARY KEY,
    type chat_type NOT NULL,
    name VARCHAR(100),
    description TEXT,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_members (
    chat_id INT REFERENCES chats(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    is_admin BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    chat_id INT REFERENCES chats(id) ON DELETE CASCADE,
    sender_id INT REFERENCES users(id) ON DELETE SET NULL,
    sender_type message_sender_type DEFAULT 'user',
    content TEXT,
    attachment_url TEXT,
    attachment_type attachment_type,
    is_read BOOLEAN DEFAULT FALSE, -- For 1-on-1 logic mostly
    read_by JSONB DEFAULT '[]', -- Array of user_ids for group read receipts
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 8. SYSTEM & AUDIT (New - for Super Admin Control)
-- =============================================
-- Keeps track of WHO changed WHAT
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- e.g., 'UPDATE_SALARY', 'DELETE_USER'
    entity_name VARCHAR(50) NOT NULL, -- Table name
    entity_id INT, -- Record ID
    details JSONB, -- Store old vs new values here
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100),
    message TEXT NOT NULL,
    type notification_type DEFAULT 'info',
    link_url TEXT, -- Where clicking takes the user
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 9. MISC (Holidays, Meetings, History)
-- =============================================
CREATE TABLE holidays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    day VARCHAR(20),
    is_recurring BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CREATE TABLE meetings (
--     id SERIAL PRIMARY KEY,
--     organizer_id INT REFERENCES users(id) ON DELETE CASCADE,
--     title VARCHAR(255) NOT NULL,
--     description TEXT,
--     start_time TIMESTAMP NOT NULL,
--     end_time TIMESTAMP NOT NULL,
--     join_url TEXT,
--     location TEXT,
--     status VARCHAR(20) DEFAULT 'Scheduled', -- Scheduled, Cancelled, Completed
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE meeting_participants (
--     meeting_id INT REFERENCES meetings(id) ON DELETE CASCADE,
--     user_id INT REFERENCES users(id) ON DELETE CASCADE,
--     status VARCHAR(20) DEFAULT 'Pending', -- Pending, Accepted, Declined
--     PRIMARY KEY (meeting_id, user_id)
-- );


CREATE TABLE IF NOT EXISTS meetings (
    id SERIAL PRIMARY KEY,
    user_id INT[],
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    join_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE past_employees (
    id SERIAL PRIMARY KEY,
    original_user_id INT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    location VARCHAR(100),
    skills TEXT[],
    employment_type  employment_type DEFAULT 'Full Time',
    joining_date DATE,
    designation VARCHAR(100),
    department_name VARCHAR(100),
    exit_date DATE,
    reason_for_exit TEXT,
    exit_interview_notes TEXT,
    removed_by_admin_id INT REFERENCES users(id) -- HR/Admin who archived
);

-- =============================================
-- 10. INDEXING (For High Performance)
-- =============================================
-- Users: Login and Filtering
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_dept ON users(department_id);

-- Attendance: Reporting and Daily Checks
CREATE INDEX idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_status ON attendance(status);

-- Leaves: HR Approvals
CREATE INDEX idx_leaves_status ON leaves(status);
CREATE INDEX idx_leaves_dates ON leaves(start_date, end_date);

-- Payroll: Monthly generation and History
CREATE INDEX idx_payroll_month ON payroll(month);
CREATE INDEX idx_payroll_user ON payroll(user_id);

-- Tasks: Dashboard queries
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_project ON tasks(project_name);

-- Chats: Loading history
CREATE INDEX idx_messages_chat_time ON messages(chat_id, created_at DESC);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);

-- =============================================
-- 11. AUTOMATION FUNCTIONS
-- =============================================

-- FUNCTION 1: Auto-generate Payroll record on User Creation
CREATE OR REPLACE FUNCTION create_initial_payroll()
RETURNS TRIGGER AS $$
DECLARE
    next_month_str VARCHAR;
BEGIN
    next_month_str := TO_CHAR((CURRENT_DATE + interval '1 month'), 'Month YYYY');

    INSERT INTO payroll (user_id, month, basic_salary, net_salary, status)
    VALUES (
        NEW.id,
        TRIM(next_month_str),
        COALESCE(NEW.salary, 0),
        COALESCE(NEW.salary, 0),
        'pending'
    );

    -- Also Log this action
    INSERT INTO audit_logs (action, entity_name, entity_id, details)
    VALUES ('USER_CREATED', 'users', NEW.id, jsonb_build_object('email', NEW.email, 'role', NEW.role));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_initial_payroll
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_initial_payroll();

-- FUNCTION 2: The "7 PM Auto-Absent" Logic
-- This function detects who hasn't checked in by now and marks them 'Absent' (or 'On Leave')
CREATE OR REPLACE FUNCTION auto_mark_absent_users()
RETURNS void AS $$
DECLARE
    today DATE := CURRENT_DATE;
BEGIN
    INSERT INTO attendance (user_id, date, status, remarks)
    SELECT
        u.id,
        today,
        'Absent',
        'System Auto-marked: No check-in by 7 PM'
    FROM users u
    WHERE u.status = 'Active'
    AND u.role NOT IN ('super_admin') -- Exclude Super Admins if needed
    AND NOT EXISTS (
        SELECT 1 FROM attendance a
        WHERE a.user_id = u.id AND a.date = today
    );
END;
$$ LANGUAGE plpgsql;

INSERT INTO users (
    name,
    email,
    password_hash,
    role,
    designation,
    status,
    department_id,
    salary
) VALUES (
    'Sujay Kotal',
    'kotalsujay8@gmail.com',
    '$2a$10$Q9uQEqmf3HN.AxqVUIQdVuG2Ay73O5VGuSs3r4BwkhxuwDtC0u.TS',
    'super_admin',
    'System Owner',
    'Active',
    NULL,
    0.00
);

-- NOTE: To run FUNCTION 2, you must set up a Cron Job.
-- If you are using pg_cron extension:
-- SELECT cron.schedule('0 19 * * *', $$SELECT auto_mark_absent_users()$$);
