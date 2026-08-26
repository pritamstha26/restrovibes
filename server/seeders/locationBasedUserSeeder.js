import { UsersModel } from '../models/model.js';
import bcrypt from 'bcrypt';
import sequelize from '../config/db.js';
import { generateRandomLocation, getKathmanduAreaCoordinates } from '../utils/location.js';

// Nepali first names
const nepaliFirstNames = [
  // Male names
  'Aarav',
  'Arjun',
  'Ayush',
  'Bibek',
  'Bijay',
  'Binod',
  'Deepak',
  'Dipesh',
  'Gagan',
  'Hari',
  'Ishan',
  'Kiran',
  'Krishna',
  'Manish',
  'Nabin',
  'Niraj',
  'Prabesh',
  'Prakash',
  'Rajesh',
  'Rajan',
  'Ramesh',
  'Rohan',
  'Sabin',
  'Sandesh',
  'Sanjay',
  'Santosh',
  'Saroj',
  'Shyam',
  'Sunil',
  'Suraj',
  'Aashish',
  'Anuj',
  'Bharat',
  'Bishnu',
  'Dhruba',
  'Ganesh',
  'Hemant',
  'Indra',
  'Jagadish',
  'Kamal',
  'Laxman',
  'Madhav',
  'Narayan',
  'Om',
  'Pawan',
  'Rabindra',
  'Sachin',
  'Tej',
  'Umesh',
  'Yagya',
  // Female names
  'Aanchal',
  'Aarati',
  'Alisha',
  'Anita',
  'Anjali',
  'Anu',
  'Barsha',
  'Binita',
  'Deepa',
  'Gita',
  'Jyoti',
  'Kabita',
  'Karuna',
  'Kripa',
  'Kritika',
  'Manisha',
  'Nisha',
  'Pooja',
  'Pratima',
  'Preeti',
  'Priyanka',
  'Sabina',
  'Samiksha',
  'Sapana',
  'Sarita',
  'Shanti',
  'Shristi',
  'Sita',
  'Sunita',
  'Sushmita',
  'Apsara',
  'Bandana',
  'Chameli',
  'Divya',
  'Jamuna',
  'Kamala',
  'Laxmi',
  'Menuka',
  'Namrata',
  'Parbati'
];

// Nepali last names
const nepaliLastNames = [
  'Adhikari',
  'Aryal',
  'Bajracharya',
  'Baniya',
  'Basnet',
  'Bhandari',
  'Bhatta',
  'Bhattarai',
  'Chaudhary',
  'Dahal',
  'Devkota',
  'Dhakal',
  'Gharti',
  'Ghimire',
  'Gurung',
  'Hamal',
  'Joshi',
  'Karki',
  'KC',
  'Khadka',
  'Koirala',
  'Lamichhane',
  'Limbu',
  'Magar',
  'Maharjan',
  'Neupane',
  'Pandey',
  'Panta',
  'Paudel',
  'Pokharel',
  'Poudel',
  'Pradhan',
  'Rai',
  'Rana',
  'Regmi',
  'Rijal',
  'Sapkota',
  'Sharma',
  'Shrestha',
  'Subedi',
  'Tamang',
  'Thapa',
  'Tiwari',
  'Upadhyay',
  'Yadav',
  'Acharya',
  'Amatya',
  'Baral',
  'Bogati',
  'Budhathoki'
];

// Email domains
const emailDomains = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'ntc.net.np',
  'mail.com.np'
];

// Generate a random email based on name
const generateEmail = (firstName, lastName) => {
  const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
  const randomNum = Math.floor(Math.random() * 1000);
  const formattedFirstName = firstName.toLowerCase().replace(/\s/g, '');
  const formattedLastName = lastName.toLowerCase().replace(/\s/g, '');
  return `${formattedFirstName}.${formattedLastName}${randomNum}@${domain}`;
};

// Generate a random phone number (Nepal format: 10 digits starting with 98 or 97)
const generatePhoneNumber = () => {
  const prefix = Math.random() < 0.5 ? '98' : '97';
  const suffix = Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(8, '0');
  return parseInt(`${prefix}${suffix}`);
};

// Get a random neighborhood from Kathmandu area
function getRandomLocationName() {
  const { neighborhoods } = getKathmanduAreaCoordinates();
  const randomIndex = Math.floor(Math.random() * neighborhoods.length);
  return neighborhoods[randomIndex].name;
}

// Helper function to check if email exists
async function isEmailUnique(email) {
  const existingUser = await UsersModel.findOne({ where: { email } });
  return !existingUser;
}

// Helper function to generate a unique email
async function generateUniqueEmail(firstName, lastName, attempts = 0) {
  // After several attempts, make email more unique by adding timestamp
  if (attempts > 5) {
    const timestamp = Date.now().toString().slice(-6);
    const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
    const formattedFirstName = firstName.toLowerCase().replace(/\s/g, '');
    const formattedLastName = lastName.toLowerCase().replace(/\s/g, '');
    return `${formattedFirstName}.${formattedLastName}.${timestamp}@${domain}`;
  }

  // Regular email generation with incrementing random number
  const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
  const randomNum = Math.floor(Math.random() * 1000) + attempts * 1000;
  const formattedFirstName = firstName.toLowerCase().replace(/\s/g, '');
  const formattedLastName = lastName.toLowerCase().replace(/\s/g, '');
  return `${formattedFirstName}.${formattedLastName}${randomNum}@${domain}`;
}

// Main seeder function for location-based users
async function seedLocationBasedUsers() {
  try {
    await sequelize.authenticate();
    console.log('Connection established successfully.');

    // Number of users to create
    const restaurantCount = process.env.restaurant_COUNT ? parseInt(process.env.restaurant_COUNT) : 500;
    const clientCount = process.env.CLIENT_COUNT ? parseInt(process.env.CLIENT_COUNT) : 100;
    const defaultPassword = await bcrypt.hash('Password@123', 10);

    console.log(`Creating ${restaurantCount} restaurants and ${clientCount} clients with location data...`);

    // Get Kathmandu area coordinates
    const kathmanduArea = getKathmanduAreaCoordinates();

    // Track used names and phones to ensure uniqueness
    const usedNames = new Set();
    const usedPhones = new Set();

    // Generate restaurants one by one to handle duplicates
    let successfulrestaurants = 0;

    console.log('Generating and inserting restaurants one by one...');

    for (let i = 0; i < restaurantCount && successfulrestaurants < restaurantCount; i++) {
      try {
        let firstName = nepaliFirstNames[Math.floor(Math.random() * nepaliFirstNames.length)];
        let lastName = nepaliLastNames[Math.floor(Math.random() * nepaliLastNames.length)];

        // Ensure unique name by appending a number suffix if needed
        let fullName = `${firstName} ${lastName}`;
        let suffix = 1;
        while (usedNames.has(fullName)) {
          suffix++;
          fullName = `${firstName} ${lastName} ${suffix}`;
        }
        usedNames.add(fullName);

        // Ensure unique phone number
        let phoneNumber;
        do {
          phoneNumber = generatePhoneNumber();
        } while (usedPhones.has(phoneNumber));
        usedPhones.add(phoneNumber);

        const location = generateRandomLocation(kathmanduArea.center, kathmanduArea.radius);
        const locationName = getRandomLocationName();

        // Generate a unique email
        let email;
        let emailAttempts = 0;
        let isUnique = false;

        while (!isUnique && emailAttempts < 10) {
          email = await generateUniqueEmail(firstName, lastName, emailAttempts);
          isUnique = await isEmailUnique(email);
          emailAttempts++;
        }

        if (!isUnique) {
          console.log(
            `Could not generate unique email for ${firstName} ${lastName} after multiple attempts, skipping...`
          );
          continue;
        }

        // Create the restaurant
        await UsersModel.create({
          first_name: firstName,
          last_name: suffix > 1 ? `${lastName} ${suffix}` : lastName,
          email: email,
          password: defaultPassword,
          phone_number: phoneNumber,
          latitude: location.latitude,
          longitude: location.longitude,
          location_name: locationName,
          role: 'restaurateurs',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        successfulrestaurants++;

        // Log progress
        if (successfulrestaurants % 10 === 0) {
          console.log(`Created ${successfulrestaurants} restaurants so far...`);
        }
      } catch (error) {
        console.error(`Error creating restaurant: ${error.message}`);
      }
    }

    // Generate clients one by one
    let successfulClients = 0;

    console.log('Generating and inserting clients one by one...');

    for (let i = 0; i < clientCount && successfulClients < clientCount; i++) {
      try {
        let firstName = nepaliFirstNames[Math.floor(Math.random() * nepaliFirstNames.length)];
        let lastName = nepaliLastNames[Math.floor(Math.random() * nepaliLastNames.length)];

        // Ensure unique name
        let fullName = `${firstName} ${lastName}`;
        let suffix = 1;
        while (usedNames.has(fullName)) {
          suffix++;
          fullName = `${firstName} ${lastName} ${suffix}`;
        }
        usedNames.add(fullName);

        // Ensure unique phone number
        let phoneNumber;
        do {
          phoneNumber = generatePhoneNumber();
        } while (usedPhones.has(phoneNumber));
        usedPhones.add(phoneNumber);

        const location = generateRandomLocation(kathmanduArea.center, kathmanduArea.radius);
        const locationName = getRandomLocationName();

        // Generate a unique email
        let email;
        let emailAttempts = 0;
        let isUnique = false;

        while (!isUnique && emailAttempts < 10) {
          email = await generateUniqueEmail(firstName, lastName, emailAttempts);
          isUnique = await isEmailUnique(email);
          emailAttempts++;
        }

        if (!isUnique) {
          console.log(
            `Could not generate unique email for ${firstName} ${lastName} after multiple attempts, skipping...`
          );
          continue;
        }

        // Create the client
        await UsersModel.create({
          first_name: firstName,
          last_name: suffix > 1 ? `${lastName} ${suffix}` : lastName,
          email: email,
          password: defaultPassword,
          phone_number: phoneNumber,
          latitude: location.latitude,
          longitude: location.longitude,
          location_name: locationName,
          role: 'client',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        successfulClients++;

        // Log progress
        if (successfulClients % 10 === 0) {
          console.log(`Created ${successfulClients} clients so far...`);
        }
      } catch (error) {
        console.error(`Error creating client: ${error.message}`);
      }
    }

    // Count actual inserted records
    const actualrestaurantCount = await UsersModel.count({ where: { role: 'restaurateurs' } });
    const actualClientCount = await UsersModel.count({ where: { role: 'client' } });

    console.log(
      `Successfully created ${successfulrestaurants} restaurants and ${successfulClients} clients with location data.`
    );
    console.log(
      `Database now has ${actualrestaurantCount} restaurants and ${actualClientCount} clients total.`
    );
  } catch (error) {
    console.error('Error seeding users with locations:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    try {
      await sequelize.close();
      console.log('Database connection closed successfully.');
    } catch (err) {
      console.error('Error closing database connection:', err);
    }
    process.exit(0);
  }
}

// Run the seeder
seedLocationBasedUsers();
