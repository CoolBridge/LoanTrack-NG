// submit.js - Complete Fixed Version
// Using global variables from CDN libraries

// === Supabase Configuration ===
const SUPABASE_URL = 'https://cwcaqufpfgcolgertdjw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3Y2FxdWZwZmdjb2xnZXJ0ZGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4NTI5NzgsImV4cCI6MjA2NzQyODk3OH0.7X5Hhn-JWZe4hUmgTzY5WGtHlur-ExDWv4Ern3TRe18';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// === EmailJS Configuration ===
const EMAILJS_SERVICE_ID = 'service_4qsuyrg';
const EMAILJS_TEMPLATE_ID = 'template_ijdbg96';
const EMAILJS_PUBLIC_KEY = 'AnMar6rra-R87ODmD';

// === DOM Elements ===
const form = document.getElementById('complaint-form');
const messageEl = document.getElementById('message');

// === Utility Functions ===
function showMessage(msg, type) {
  messageEl.innerHTML = msg;
  messageEl.className = type;
  messageEl.style.display = 'block';
  messageEl.scrollIntoView({ behavior: 'smooth' });
}

function hideMessage() {
  messageEl.textContent = '';
  messageEl.style.display = 'none';
}

function setButtonState(button, text, disabled) {
  button.textContent = text;
  button.disabled = disabled;
}

// === File Upload Handler ===
async function uploadFile(file, regId) {
  if (!file || file.size === 0) {
    return null;
  }

  // Check file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size exceeds 5MB limit');
  }

  console.log('📎 Uploading file:', file.name, 'Size:', file.size, 'bytes');

  const fileExt = file.name.split('.').pop();
  const uniqueFileName = `${regId}-${Date.now()}.${fileExt}`;

  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('uploads')
    .upload(uniqueFileName, file);

  if (uploadError) {
    console.error('❌ File upload error:', uploadError);
    throw new Error('File upload failed: ' + uploadError.message);
  }

  console.log('✅ File uploaded successfully:', uploadData);

  const { data: urlData } = supabase
    .storage
    .from('uploads')
    .getPublicUrl(uniqueFileName);

  console.log('📄 File URL:', urlData.publicUrl);
  return urlData.publicUrl;
}

// === Database Save Handler ===
async function saveComplaint(complaintData) {
  console.log('💾 Saving complaint to database...');

  const { error: dbError, data: dbData } = await supabase
    .from('complaints')
    .insert([complaintData]);

  if (dbError) {
    console.error('❌ Database error:', dbError);
    throw new Error('Database save failed: ' + dbError.message);
  }

  console.log('✅ Complaint saved to database successfully:', dbData);
  return dbData;
}

// === Email Notification Handler ===
async function sendEmailNotification(emailData) {
  console.log('📧 Sending email notification...');

  try {
    const result = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, emailData);
    console.log('✅ Email sent successfully:', result);
    return result;
  } catch (emailError) {
    console.warn('📧 Email failed (non-critical):', emailError);
    throw emailError;
  }
}

// === Form Validation ===
function validateForm(formData) {
  const requiredFields = ['full_name', 'phone', 'email', 'reg_id', 'university', 'complaint_type', 'description'];
  
  for (const field of requiredFields) {
    const value = formData.get(field);
    if (!value || value.trim() === '') {
      throw new Error(`${field.replace('_', ' ')} is required`);
    }
  }

  // Email validation
  const email = formData.get('email');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Please enter a valid email address');
  }

  // Phone validation (basic)
  const phone = formData.get('phone');
  if (phone.length < 10) {
    throw new Error('Please enter a valid phone number');
  }

  // NELFUND ID validation
  const regId = formData.get('reg_id');
  if (!regId.includes('NELF')) {
    throw new Error('Please enter a valid NELFUND Registration ID (should contain "NELF")');
  }
}

// === Main Form Submit Handler ===
async function handleFormSubmit(e) {
  e.preventDefault();
  
  // Reset UI state
  hideMessage();
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  setButtonState(submitBtn, 'Submitting...', true);

  try {
    // Get form data
    const formData = new FormData(form);
    
    // Validate form
    validateForm(formData);

    // Extract form values
    const fullName = formData.get('full_name').trim();
    const phone = formData.get('phone').trim();
    const email = formData.get('email').trim();
    const regId = formData.get('reg_id').trim();
    const university = formData.get('university');
    const complaintType = formData.get('complaint_type');
    const description = formData.get('description').trim();
    const file = formData.get('file');

    console.log('📋 Form Data:', {
      fullName,
      phone,
      email,
      regId,
      university,
      complaintType,
      description: description.substring(0, 100) + '...',
      hasFile: file && file.size > 0
    });

    // Handle file upload if present
    let fileUrl = null;
    if (file && file.size > 0) {
      fileUrl = await uploadFile(file, regId);
    }

    // Prepare complaint data
    const complaintData = {
      full_name: fullName,
      phone,
      email,
      reg_id: regId,
      university,
      complaint_type: complaintType,
      description,
      file_url: fileUrl,
      created_at: new Date().toISOString()
    };

    // Save to database
    await saveComplaint(complaintData);

    // Send email notification (non-blocking)
    try {
      await sendEmailNotification({
        to_name: fullName,
        to_email: email,
        reg_id: regId,
        complaint_type: complaintType,
        university,
        description: description.substring(0, 200) + '...'
      });
    } catch (emailError) {
      console.warn('Email notification failed, but complaint was saved successfully');
    }

    // Success feedback
    showMessage(
      '✅ Thank you for your submission!<br>' +
      'Your complaint has been received and will be reviewed within 5-7 business days.<br>' +
      'Reference ID: ' + regId,
      'success'
    );

    // Reset form
    form.reset();

  } catch (error) {
    console.error('❌ Form submission error:', error);
    showMessage('❌ ' + error.message, 'error');
  } finally {
    // Reset button state
    setButtonState(submitBtn, originalText, false);
  }
}

// === Test Supabase Connection ===
async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    // Test database connection
    const { data, error } = await supabase
      .from('complaints')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }

    console.log('✅ Database connection successful');

    // Test storage connection
    const { data: buckets, error: storageError } = await supabase
      .storage
      .listBuckets();

    if (storageError) {
      console.error('❌ Storage connection test failed:', storageError);
      return false;
    }

    console.log('✅ Storage connection successful');
    return true;

  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
}

// === Initialize Application ===
function initializeApp() {
  console.log('🚀 Initializing LoanTrack complaint form...');

  // Test connections
  testSupabaseConnection();

  // Add form event listener
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
    console.log('✅ Form event listener attached');
  } else {
    console.error('❌ Form element not found');
  }

  // Add file input validation
  const fileInput = form.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file && file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please choose a smaller file.');
        e.target.value = '';
      }
    });
  }

  console.log('✅ Application initialized successfully');
}

// === Start Application ===
// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
