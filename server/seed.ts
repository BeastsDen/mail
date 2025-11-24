import bcrypt from "bcryptjs";
import { storage } from "./storage";

async function seed() {
  console.log("Seeding database with comprehensive sample data...");

  try {
    console.log("Clearing existing sample data...");
    
    const existingAdminUser = await storage.getUserByEmail("admin@hackure.in");
    const existingSalesUser = await storage.getUserByEmail("sales@hackure.in");
    
    if (existingAdminUser) {
      const adminEmails = await storage.getSentEmailsByUser(existingAdminUser.id);
      const adminLogs = await storage.getActivityLogsByUser(existingAdminUser.id);
      console.log(`Deleting ${adminEmails.length} emails and ${adminLogs.length} logs for admin user`);
    }
    
    if (existingSalesUser) {
      const salesEmails = await storage.getSentEmailsByUser(existingSalesUser.id);
      const salesLogs = await storage.getActivityLogsByUser(existingSalesUser.id);
      console.log(`Deleting ${salesEmails.length} emails and ${salesLogs.length} logs for sales user`);
    }
    
    const allDatasets = await storage.getAllDatasets();
    for (const dataset of allDatasets) {
      await storage.deleteDataset(dataset.id);
    }
    
    const allTemplates = await storage.getAllEmailTemplates();
    for (const template of allTemplates) {
      await storage.deleteEmailTemplate(template.id);
    }
    
    if (existingAdminUser) {
      await storage.deleteUser(existingAdminUser.id);
    }
    
    if (existingSalesUser) {
      await storage.deleteUser(existingSalesUser.id);
    }
    
    console.log("✓ Cleared existing sample data and users");

    const adminPassword = await bcrypt.hash("Test@1234", 12);
    const salesPassword = await bcrypt.hash("Test@1234", 12);

    const adminUser = await storage.createUser({
      email: "admin@hackure.in",
      passwordHash: adminPassword,
      role: "admin",
    });

    const salesUser = await storage.createUser({
      email: "sales@hackure.in",
      passwordHash: salesPassword,
      role: "sales",
    });

    console.log("✓ Created admin@hackure.in (role: admin)");
    console.log("✓ Created sales@hackure.in (role: sales)");

    const template1 = await storage.createEmailTemplate({
      name: "Product Introduction",
      subject: "Introducing our new product to {{company}}",
      body: "Hi {{firstName}},\n\nI hope this email finds you well. I wanted to reach out to introduce our latest product that could be beneficial for {{company}}.\n\nWe specialize in providing innovative solutions that help businesses like yours streamline operations and increase productivity.\n\nWould you be interested in a brief call next week to discuss how we can help {{company}}?\n\nBest regards,\nSales Team",
      variables: ["firstName", "company"],
      createdBy: salesUser.id,
    });

    const template2 = await storage.createEmailTemplate({
      name: "Follow-up Email",
      subject: "Following up on our conversation",
      body: "Hi {{name}},\n\nI wanted to follow up on our previous conversation about how we can help {{company}} achieve its goals.\n\nI'd love to schedule a quick 15-minute call to discuss this further. What does your calendar look like this week?\n\nLooking forward to hearing from you.\n\nBest,\nSales Team",
      variables: ["name", "company"],
      createdBy: adminUser.id,
    });

    const template3 = await storage.createEmailTemplate({
      name: "Partnership Proposal",
      subject: "Partnership opportunity for {{company}}",
      body: "Dear {{name}},\n\nI came across {{company}} and was impressed by your work in the industry.\n\nWe believe there's a great opportunity for our companies to collaborate. I'd love to explore potential partnership opportunities that could benefit both of us.\n\nWould you be open to a brief conversation about this?\n\nWarm regards,\nBusiness Development Team",
      variables: ["name", "company"],
      createdBy: adminUser.id,
    });

    console.log("✓ Created 3 email templates");

    const dataset1 = await storage.createDataset({
      name: "Tech Startups Q4 2024",
      uploadedBy: adminUser.id,
      recordsCount: 5,
      status: "active",
    });

    const dataset2 = await storage.createDataset({
      name: "E-commerce Leads",
      uploadedBy: salesUser.id,
      recordsCount: 3,
      status: "active",
    });

    console.log("✓ Created 2 datasets");

    const contacts1 = [
      {
        datasetId: dataset1.id,
        name: "John Smith",
        email: "john.smith@techcorp.com",
        company: "TechCorp Inc",
        customFields: { position: "CTO", industry: "Software" },
      },
      {
        datasetId: dataset1.id,
        name: "Sarah Johnson",
        email: "sarah.j@innovate.io",
        company: "Innovate Solutions",
        customFields: { position: "CEO", industry: "AI/ML" },
      },
      {
        datasetId: dataset1.id,
        name: "Michael Chen",
        email: "m.chen@cloudsys.com",
        company: "CloudSys Technologies",
        customFields: { position: "VP Engineering", industry: "Cloud" },
      },
      {
        datasetId: dataset1.id,
        name: "Emma Williams",
        email: "emma.w@datastream.io",
        company: "DataStream Analytics",
        customFields: { position: "Head of Product", industry: "Data Analytics" },
      },
      {
        datasetId: dataset1.id,
        name: "David Brown",
        email: "dbrown@securetech.com",
        company: "SecureTech Solutions",
        customFields: { position: "CIO", industry: "Cybersecurity" },
      },
    ];

    const contacts2 = [
      {
        datasetId: dataset2.id,
        name: "Lisa Anderson",
        email: "lisa@shopease.com",
        company: "ShopEase",
        customFields: { position: "Marketing Director", industry: "E-commerce" },
      },
      {
        datasetId: dataset2.id,
        name: "Robert Taylor",
        email: "rtaylor@buyonline.net",
        company: "BuyOnline Marketplace",
        customFields: { position: "Operations Manager", industry: "Retail" },
      },
      {
        datasetId: dataset2.id,
        name: "Jessica Martinez",
        email: "jessica@fashionhub.com",
        company: "Fashion Hub",
        customFields: { position: "CEO", industry: "Fashion E-commerce" },
      },
    ];

    await storage.createDatasetContacts(contacts1);
    await storage.createDatasetContacts(contacts2);

    console.log("✓ Created 8 contacts across datasets");

    const createdContacts1 = await storage.getDatasetContacts(dataset1.id);
    const createdContacts2 = await storage.getDatasetContacts(dataset2.id);

    const sampleEmails = [
      {
        sentBy: salesUser.id,
        recipientEmail: createdContacts1[0].email,
        recipientName: createdContacts1[0].name,
        subject: `Introducing our new product to ${createdContacts1[0].company}`,
        body: `Hi John,\n\nI hope this email finds you well...`,
        templateId: template1.id,
        datasetId: dataset1.id,
        contactId: createdContacts1[0].id,
        status: "sent",
        leadStatus: "hot",
        opened: true,
        openedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        replied: true,
        repliedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        sentBy: salesUser.id,
        recipientEmail: createdContacts1[1].email,
        recipientName: createdContacts1[1].name,
        subject: `Introducing our new product to ${createdContacts1[1].company}`,
        body: `Hi Sarah,\n\nI hope this email finds you well...`,
        templateId: template1.id,
        datasetId: dataset1.id,
        contactId: createdContacts1[1].id,
        status: "sent",
        leadStatus: "cold",
        opened: true,
        openedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        replied: false,
        sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        sentBy: adminUser.id,
        recipientEmail: createdContacts1[2].email,
        recipientName: createdContacts1[2].name,
        subject: `Partnership opportunity for ${createdContacts1[2].company}`,
        body: `Dear Michael,\n\nI came across CloudSys Technologies...`,
        templateId: template3.id,
        datasetId: dataset1.id,
        contactId: createdContacts1[2].id,
        status: "sent",
        leadStatus: "hot",
        opened: true,
        openedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        replied: false,
        sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        sentBy: salesUser.id,
        recipientEmail: createdContacts2[0].email,
        recipientName: createdContacts2[0].name,
        subject: `Introducing our new product to ${createdContacts2[0].company}`,
        body: `Hi Lisa,\n\nI hope this email finds you well...`,
        templateId: template1.id,
        datasetId: dataset2.id,
        contactId: createdContacts2[0].id,
        status: "sent",
        leadStatus: "unassigned",
        opened: false,
        sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        sentBy: salesUser.id,
        recipientEmail: createdContacts2[1].email,
        recipientName: createdContacts2[1].name,
        subject: `Introducing our new product to ${createdContacts2[1].company}`,
        body: `Hi Robert,\n\nI hope this email finds you well...`,
        templateId: template1.id,
        datasetId: dataset2.id,
        contactId: createdContacts2[1].id,
        status: "sent",
        leadStatus: "dead",
        opened: true,
        openedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        replied: false,
        sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const emailData of sampleEmails) {
      await storage.createSentEmail(emailData);
    }

    console.log("✓ Created 5 sent emails with various statuses");

    await storage.createActivityLog({
      userId: adminUser.id,
      action: "database_seeded",
      entityType: "system",
      entityId: "seed",
      details: { message: "Initial database seed completed" },
    });

    console.log("\n✅ Database seeding completed successfully!");
    console.log("\nYou can now login with:");
    console.log("  - admin@hackure.in / Test@1234 (Admin)");
    console.log("  - sales@hackure.in / Test@1234 (Sales)");
    console.log("\nSample data includes:");
    console.log("  - 2 users");
    console.log("  - 3 email templates");
    console.log("  - 2 datasets with 8 contacts");
    console.log("  - 5 sent emails with various lead statuses");
    
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seed();
