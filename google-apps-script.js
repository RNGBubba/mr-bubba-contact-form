function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    var name = data.name || 'Not provided';
    var email = data.email || 'Not provided';
    var business = data.business || 'Not provided';
    var serviceType = data.serviceType || 'Not provided';
    
    var ip = e.parameter.ip || 'Unknown';
    var userAgent = e.parameter.userAgent || 'Unknown';
    var timestamp = new Date().toISOString();
    
    var subject = 'New Inquiry: ' + serviceType + ' - ' + name;
    
    var body = 'New Project Inquiry\n\n';
    body += 'Name: ' + name + '\n';
    body += 'Email: ' + email + '\n';
    body += 'Business: ' + business + '\n';
    body += 'Service: ' + serviceType + '\n\n';
    
    // Add additional fields
    for (var key in data) {
      if (key !== 'name' && key !== 'email' && key !== 'business' && key !== 'serviceType') {
        body += key + ': ' + data[key] + '\n';
      }
    }
    
    body += '\n---\n';
    body += 'IP: ' + ip + '\n';
    body += 'User-Agent: ' + userAgent + '\n';
    body += 'Timestamp: ' + timestamp + '\n';
    
    GmailApp.sendEmail('mrbubba@agentmail.to', subject, body);
    
    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
