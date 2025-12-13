
# General Bots Desktop

An AI-powered desktop automation tool that records and plays back user interactions useful for legacy systems and common desktop tasks. The BotDesktop automation tool fills a critical gap in the enterprise automation landscape by addressing legacy systems and desktop applications that lack modern APIs or integration capabilities. While botserver excels at creating conversational bots for modern channels like web, mobile and messaging platforms, many organizations still rely heavily on traditional desktop applications, mainframe systems, and custom internal tools that can only be accessed through their user interface. BotDesktop's ability to record and replay user interactions provides a practical bridge between these legacy systems and modern automation needs.


![image](https://github.com/user-attachments/assets/477b7472-81d8-4e38-a541-70a7e2496a02)


The tool's AI-powered approach to desktop automation represents a significant advancement over traditional robotic process automation (RPA) tools. By leveraging machine learning to understand screen elements and user interactions, BotDesktop can adapt to minor UI changes and variations that would break conventional scripted automation. This resilience is particularly valuable in enterprise environments where applications receive regular updates or where slight variations exist between different versions or installations of the same software. The AI component also simplifies the creation of automation scripts - instead of requiring complex programming, users can simply demonstrate the desired actions which BotDesktop observes and learns to replicate.


From an integration perspective, BotDesktop complements botserver by enabling end-to-end automation scenarios that span both modern and legacy systems. For example, a bot created in botserver could collect information from users through a modern chat interface, then use BotDesktop to input that data into a legacy desktop application that lacks API access. This hybrid approach allows organizations to modernize their user interactions while still leveraging their existing IT investments. Additionally, BotDesktop can automate routine desktop tasks like file management, data entry, and application monitoring that fall outside the scope of conversational bot interactions.


The combined toolset of botserver and BotDesktop provides organizations with comprehensive automation capabilities across their entire technology stack. While botserver handles the modern, API-driven interactions with users across multiple channels, BotDesktop extends automation capabilities to the desktop environment where many critical business processes still reside. This dual approach allows organizations to progressively modernize their systems while maintaining operational efficiency through automation of both new and legacy components. The result is a more flexible and complete automation solution that can adapt to various technical environments and business needs.
## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a .env file with your Azure OpenAI credentials

3. Development:
```bash
npm run dev
```

4. Build:
```bash
npm run build
```

## Testing
```bash
npm test
```
