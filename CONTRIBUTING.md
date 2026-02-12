# Contribution Guide

Thanks for your interest in this project! Here's how to contribute.

## About This Project

This is a **personal side project** for bug triage automation. It's intended for learning and customization for personal use.

## Ways to Contribute

### 1. Fork & Customize
Feel free to fork this repo and adapt it for your own needs:
- Different issue trackers (Jira, Linear, etc.)
- Custom ranking algorithms
- Additional AI features
- Different UI frameworks

### 2. Report Issues
If you find bugs or have feedback:
- Describe what you were doing
- Include error messages or logs
- Mention your environment (Node version, OS, etc.)

### 3. Suggest Features
Ideas for improvements are welcome:
- New integration points
- Performance optimizations
- Enhanced UI/UX
- Additional configuration options

## Local Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed setup instructions.

## Code Guidelines

- **Use TypeScript** - Maintain type safety
- **Keep it simple** - Add features incrementally
- **Test changes** - Verify both backend and frontend work
- **Document complex logic** - Help future maintainers

## Submitting Changes

1. Create a feature branch: `git checkout -b feature/your-idea`
2. Make focused changes
3. Test thoroughly
4. Commit with clear messages
5. Push and submit a PR

## Areas for Enhancement

Consider contributing to:

### Ranking Algorithm (`backend/src/rank.ts`)
- Add more scoring factors
- Implement machine learning
- Support different ranking strategies

### UI/UX (`frontend/src/components/`)
- Improve visual design
- Add filtering/sorting options
- Mobile responsiveness
- Dark mode support

### Integrations
- Support Jira, Linear, GitHub Issues
- Add Slack notifications
- Export to different formats

### Performance
- Cache ranking results
- Implement pagination
- Optimize AI analysis

### AI Analysis (`backend/src/ai.ts`)
- Add more LLM providers
- Improve prompt engineering
- Add follow-up analysis

## Questions?

This project is designed for personal learning and customization. Feel free to:
- Modify for your specific use case
- Extract components for other projects
- Learn from the architecture and patterns

## License

Personal project - adjust licensing as needed for your fork.

Happy coding! 🚀
