const nodemailer = require('nodemailer');

// Создаем транспортер для отправки email
// Поддерживаем разные провайдеры: Яндекс, Gmail, Mail.ru и др.
const createTransporter = () => {
    const provider = process.env.SMTP_PROVIDER || 'yandex'; // yandex, gmail, mailru
    
    let config = {
        pool: true, // используем пул соединений для лучшей производительности
        maxConnections: 5,
        maxMessages: 100,
    };
    
    switch (provider) {
        case 'yandex':
            config = {
                ...config,
                host: 'smtp.yandex.ru',
                port: 465,
                secure: true, // SSL
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            };
            break;
        case 'gmail':
            config = {
                ...config,
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS // для Gmail нужно использовать App Password
                }
            };
            break;
        case 'mailru':
            config = {
                ...config,
                host: 'smtp.mail.ru',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            };
            break;
        default:
            // Кастомный SMTP
            config = {
                ...config,
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            };
    }
    
    return nodemailer.createTransport(config);
};

let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        transporter = createTransporter();
    }
    return transporter;
};

// Функция отправки email для сброса пароля
const sendPasswordResetEmail = async (toEmail, resetToken, userName = '') => {
    const transporter = getTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
        from: `"Лига Абитуриентов" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'Восстановление пароля',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #0808E4; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">ЛИГА АБИТУРИЕНТОВ</h1>
                    <p style="color: #BEE500; margin: 10px 0 0 0; font-size: 16px;">КГПИ КЕМГУ</p>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
                    <h2 style="color: #0808E4; margin-top: 0;">Восстановление пароля</h2>
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        ${userName ? `Здравствуйте, ${userName}!` : 'Здравствуйте!'}
                    </p>
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        Вы запросили восстановление пароля для вашего аккаунта в системе "Лига Абитуриентов".
                    </p>
                    <p style="color: #333; font-size: 16px; line-height: 1.6;">
                        Для установки нового пароля, пожалуйста, перейдите по ссылке ниже:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background: #0808E4; color: white; padding: 15px 30px; 
                                  text-decoration: none; border-radius: 8px; display: inline-block;
                                  font-weight: bold; font-size: 16px;">
                            Установить новый пароль
                        </a>
                    </div>
                    <p style="color: #666; font-size: 14px; line-height: 1.5;">
                        Или скопируйте эту ссылку в браузер:<br>
                        <a href="${resetUrl}" style="color: #0808E4; word-break: break-all;">${resetUrl}</a>
                    </p>
                    <p style="color: #666; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                        <strong>Важно:</strong> Ссылка действительна в течение 1 часа.
                        Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} Лига Абитуриентов КГПИ КЕМГУ<br>
                        Это автоматическое письмо, пожалуйста, не отвечайте на него.
                    </p>
                </div>
            </div>
        `,
        text: `
ЛИГА АБИТУРИЕНТОВ КГПИ КЕМГУ

Восстановление пароля

${userName ? `Здравствуйте, ${userName}!` : 'Здравствуйте!'}

Вы запросили восстановление пароля для вашего аккаунта в системе "Лига Абитуриентов".

Для установки нового пароля, пожалуйста, перейдите по ссылке:
${resetUrl}

Важно: Ссылка действительна в течение 1 часа.
Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.

© ${new Date().getFullYear()} Лига Абитуриентов КГПИ КЕМГУ
        `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${toEmail}, messageId: ${result.messageId}`);
    return result;
};

// Проверка подключения SMTP
const verifyConnection = async () => {
    try {
        const transporter = getTransporter();
        await transporter.verify();
        console.log('SMTP connection verified successfully');
        return true;
    } catch (err) {
        console.error('SMTP connection failed:', err.message);
        return false;
    }
};

module.exports = {
    getTransporter,
    sendPasswordResetEmail,
    verifyConnection
};
