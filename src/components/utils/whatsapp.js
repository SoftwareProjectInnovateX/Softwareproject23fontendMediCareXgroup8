// src/components/utils/whatsapp.js

export const WHATSAPP_NUMBER = "94760273368";
export const WHATSAPP_COLOR  = "#25D366";
export const WHATSAPP_LABEL  = "Chat on WhatsApp";

export const openWhatsApp = (message = "Hello, I need more details") => {
  const text = encodeURIComponent(message);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank");
};