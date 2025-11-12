"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LoginModal } from "@/components/auth/LoginModal";
import { RegisterModal } from "@/components/auth/RegisterModal";
import { useAuth } from "@/contexts/AuthContext";
// using VoiceInputButton's built-in status inline; no separate ConnectionStatusIndicator import
import { ThemeToggle } from "./ThemeToggle";
import { VoiceInputButton } from "./VoiceInputButton";

function InlineVoice() {
	return (
		<div className="flex items-center gap-3">
			<div className="hidden sm:flex items-center">
				<VoiceInputButton
					size="sm"
					showStatus={true}
					statusInline={true}
					iconTranslateY={5}
					iconSizeClass="w-6 h-6"
				/>
			</div>
		</div>
	);
}

const navigationItems = [
	{ href: "/dashboard", label: "Dashboard", icon: "📊" },
	{ href: "/goals", label: "Goals", icon: "🎯" },
	{ href: "/tasks", label: "Tasks", icon: "✓" },
	{ href: "/habits", label: "Habits", icon: "🔥" },
	{ href: "/pomodoro", label: "Focus", icon: "🍅" },
];

type NavBarProps = {
	onMobileSidebarToggle?: () => void;
};

export function NavBar({ onMobileSidebarToggle }: NavBarProps) {
	const pathname = usePathname();
	const { user, isAuthenticated, logout } = useAuth();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [loginModalOpen, setLoginModalOpen] = useState(false);
	const [registerModalOpen, setRegisterModalOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const [isVisible, setIsVisible] = useState(true);
	const [lastScrollY, setLastScrollY] = useState(0);

	const handleAuthSuccess = () => {
		// Modal will close automatically, can add toast here if desired
	};

	const handleSwitchToRegister = () => {
		setLoginModalOpen(false);
		setRegisterModalOpen(true);
	};

	const handleSwitchToLogin = () => {
		setRegisterModalOpen(false);
		setLoginModalOpen(true);
	};

	useEffect(() => {
		const handleScroll = () => {
			const currentScrollY = window.scrollY;

			// Update scrolled state for background opacity
			setIsScrolled(currentScrollY > 20);

			// Hide/show navbar based on scroll direction
			if (currentScrollY < 100) {
				// Always show at top
				setIsVisible(true);
			} else if (currentScrollY > lastScrollY && currentScrollY > 200) {
				// Scrolling down - hide
				setIsVisible(false);
				setMobileMenuOpen(false);
			} else if (currentScrollY < lastScrollY) {
				// Scrolling up - show
				setIsVisible(true);
			}

			setLastScrollY(currentScrollY);
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, [lastScrollY]);

	return (
		<>
			<a
				href="#maincontent"
				className="sr-only focus:not-sr-only fixed top-4 left-1/2 -translate-x-1/2 z-60 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium shadow-lg transition-all"
			>
				Skip to content
			</a>

			<nav
				className={`
          fixed top-4 left-4 right-4 z-50 transition-all duration-300 ease-out
          ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}
        `}
			>
				<div className="max-w-4xl mx-auto">
					<div
						className={`surface-elevated rounded-2xl transition-all duration-300 ${isScrolled ? "shadow-lg" : "shadow-sm"}`}
					>
						<div className="px-4 sm:px-6">
							<div className="flex items-center justify-between h-12">
								{/* Logo */}
								<Link
									href="/"
									className="flex items-center space-x-3 transition-all duration-200 group"
								>
									<div className="w-7 h-7 rounded-lg icon-surface flex items-center justify-center shadow-sm">
										<span className="text-sm font-bold text-primary-foreground">
											N
										</span>
									</div>
									<span className="text-sm font-medium text-foreground tracking-tight hidden sm:inline-block">
										Nargis
									</span>
								</Link>

								{/* Desktop Navigation */}
								<div className="hidden md:flex items-center space-x-2">
									{navigationItems.map((item) => {
										const isActive = pathname === item.href;
										return (
											<Link
												key={item.href}
												href={item.href}
												aria-current={isActive ? "page" : undefined}
												className={`relative px-3 py-1 rounded-lg text-sm font-semibold transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background
						  ${isActive ? "text-primary bg-primary-subtle shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-hover/40"}`}
											>
												<span
													className="mr-2 icon-surface hover-elevate"
													aria-hidden
												>
													{item.icon}
												</span>
												{item.label}
												{isActive && (
													<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
												)}
											</Link>
										);
									})}
								</div>

								{/* Theme Toggle & Mobile Menu */}
								<div className="flex items-center space-x-3">
									{/* Voice button (compact) with inline status */}
									<InlineVoice />

									{/* Auth buttons removed from navbar; floating control added separately */}

									<div className="p-1 rounded-md border-border/40 bg-background/60">
										<ThemeToggle />
									</div>

									{/* Mobile menu button - toggles nav links */}
									<button
										type="button"
										onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
										className="md:hidden p-2 rounded-xl hover:bg-hover/50 transition-all duration-200 active:scale-95"
										aria-label="Toggle mobile menu"
										aria-expanded={mobileMenuOpen}
									>
										<svg
											className="w-5 h-5 transition-transform duration-200"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
											style={{
												transform: mobileMenuOpen
													? "rotate(90deg)"
													: "rotate(0deg)",
											}}
										>
											{mobileMenuOpen ? (
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M6 18L18 6M6 6l12 12"
												/>
											) : (
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M4 6h16M4 12h16M4 18h16"
												/>
											)}
										</svg>
									</button>

									{/* Mobile sidebar toggle (hamburger) */}
									<button
										type="button"
										onClick={() => onMobileSidebarToggle && onMobileSidebarToggle()}
										className="md:hidden p-2 rounded-xl hover:bg-hover/50 transition-all duration-200 active:scale-95"
										aria-label="Open sidebar"
									>
										<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
										</svg>
									</button>
								</div>
							</div>

							{/* Mobile Navigation */}
							{mobileMenuOpen && (
								<div className="md:hidden border-t border-border/30 py-3 animate-in slide-in-from-top-2 duration-200">
									<div className="space-y-1">
										{navigationItems.map((item) => {
											const isActive = pathname === item.href;
											return (
												<Link
													key={item.href}
													href={item.href}
													onClick={() => setMobileMenuOpen(false)}
													aria-current={isActive ? "page" : undefined}
													className={`block px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background
							  ${isActive ? "bg-primary-subtle text-primary" : "text-muted-foreground hover:text-foreground hover:bg-hover/40"}
							`}
												>
													<span className="mr-3" aria-hidden>
														{item.icon}
													</span>
													<span className="align-middle">{item.label}</span>
												</Link>
											);
										})}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</nav>

			{/* Floating auth control (separate from navbar) */}
			<div className="fixed top-4 right-24 z-60">
				{isAuthenticated ? (
					<div className="inline-flex items-center h-12 rounded-2xl shadow-sm overflow-hidden bg-background">
						<span className="px-4 text-sm font-medium h-full flex items-center text-foreground">{user?.name || user?.email}</span>
						<div className="w-px bg-border/40 h-6" aria-hidden />
						<button
							type="button"
							onClick={logout}
							className="px-4 text-sm font-medium h-full flex items-center bg-primary text-primary-foreground hover:bg-primary/80 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
						>
							Logout
						</button>
					</div>
				) : (
					<div className="inline-flex items-center h-12 rounded-2xl shadow-sm overflow-hidden bg-transparent px-2 gap-0 justify-center">
						<button
							type="button"
							onClick={() => setLoginModalOpen(true)}
							className="btn btn-primary px-4 py-1 text-sm font-medium h-9 flex items-center rounded-lg justify-center"
							aria-label="Sign in"
						>
							Sign In
						</button>

						<div className="w-px bg-primary-foreground/30 h-6 mx-0.5" aria-hidden />

						<button
							type="button"
							onClick={() => setRegisterModalOpen(true)}
							className="btn btn-primary px-3 py-1 text-sm font-medium h-9 flex items-center rounded-lg justify-center"
							aria-label="Sign up"
						>
							Sign Up
						</button>
					</div>
				)}
			</div>

			{/* Auth Modals */}
			<LoginModal
				isOpen={loginModalOpen}
				onClose={() => setLoginModalOpen(false)}
				onSuccess={handleAuthSuccess}
				onSwitchToRegister={handleSwitchToRegister}
			/>
			<RegisterModal
				isOpen={registerModalOpen}
				onClose={() => setRegisterModalOpen(false)}
				onSuccess={handleAuthSuccess}
				onSwitchToLogin={handleSwitchToLogin}
			/>
		</>
	);
}
