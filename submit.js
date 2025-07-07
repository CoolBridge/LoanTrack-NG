import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import emailjs from 'https://cdn.emailjs.com/dist/email.min.mjs';

// === 1. Supabase credentials ===
const SUPABASE_URL = 'https://cwcaqufpfgcolgertdjw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Y2FxdWZwZmdjb2xnZXJ0ZGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NTI5NzgsImV4cCI6MjA2NzQyODk3OH0.7X5Hhn-JWZe4hUmgTzY5WGtHlur-ExDWv4Ern3TRe18';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// === 2. EmailJS credentials ===
const EMAILJS_SERVICE_ID = 'service_4qsuyrg';
const EMAILJS_TEMPLATE_ID = 'template_ijdbg96';
const EMAILJS_PUBLIC_KEY = 'AnMar6rra-R87ODmD';

emailjs.init(EMAILJS_PUBLIC_KEY);

// === 3. Get form elements ===
const form = document.getElementById('complaint-form');
const messageEl = document.getElementById('message');

// === 4. Handle form submission ===
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  messageEl.textContent = '';
  messageEl.style.display = 'none';

  const formData = new FormData(form);

  const fullName = formData.get('full_name');
  const phone = formData.get('phone');
  const email = formData.get('email');
  const regId = formData.get('reg_id');
  const university = formData.get('university');
  const complaintType = formData.get('complaint_type');
  const description = formData.get('description');
  const file = formData.get('file');

  let fileUrl = null;

  // === 5. Upload file to Supabase Storage (if provided) ===
  if (file && file.size > 0) {
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = `${regId}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase
      .storage
      .from('uploads')
      .upload(uniqueFileName, file);

    if (error) {
      showMessage('❌ File upload failed. Please try again.', 'error');
      return;
    }

    const { data: urlData } = supabase
      .storage
      .from('uploads')
      .getPublicUrl(uniqueFileName);

    fileUrl = urlData.publicUrl;
  }

  // === 6. Save complaint data to Supabase ===
  const { error: dbError } = await supabase
    .from('complaints')
    .insert([{
      full_name: fullName,
      phone,
      email,
      reg_id: regId,
      university,
      complaint_type: complaintType,
      description,
      file_url: fileUrl,
      created_at: new Date().toISOString()
    }]);

  if (dbError) {
    console.error('DB Error:', dbError);
    showMessage('❌ Failed to save your complaint. Please try again.', 'error');
    return;
  }

  // === 7. Send confirmation email using EmailJS ===
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_name: fullName,
      to_email: email,
      reg_id: regId,
      complaint_type: complaintType,
      university
    });
  } catch (err) {
    console.warn('📧 Email failed (but not critical):', err);
  }

  // === 8. Show success message and reset form ===
  showMessage('✅ Thank you for your submission.<br>We are working to resolve your complaint as soon as possible.', 'success');
  form.reset();
});

// === 9. Helper: Show success or error messages ===
function showMessage(msg, type) {
  messageEl.innerHTML = msg;
  messageEl.className = type;
  messageEl.style.display = 'block';
  messageEl.scrollIntoView({ behavior: 'smooth' });
}
