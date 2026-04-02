"use client";

import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import {
  Calendar,
  Download,
  ExternalLink,
  Bell,
  Video,
  Plus,
} from "lucide-react";
import {
  CalendarService,
  ReminderService,
  type MeetingDetails,
  type CalendarEvent,
} from "~/lib/calendar-service";
import { toast } from "sonner";

interface CalendarIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  initialMeetingText?: string;
  senderEmail?: string;
  onMeetingScheduled?: (meetingDetails: MeetingDetails) => void;
}

export function CalendarIntegration({
  isOpen,
  onClose,
  initialMeetingText = "",
  senderEmail = "",
  onMeetingScheduled,
}: CalendarIntegrationProps) {
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails>({
    subject: "",
    participants: [senderEmail].filter(Boolean),
    proposedTimes: [new Date()],
    duration: 60,
    description: "",
    isVirtual: false,
  });
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("14:00");
  const [reminderMinutes, setReminderMinutes] = useState([15, 60]); // 15 min and 1 hour before
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState({
    action: "",
    message: "",
    nextSteps: "",
  });

  // Parse initial meeting text when dialog opens
  useEffect(() => {
    if (isOpen && initialMeetingText && senderEmail) {
      const parsed = CalendarService.parseMeetingFromText(
        initialMeetingText,
        senderEmail,
      );
      if (parsed) {
        setMeetingDetails(parsed);
        if (parsed.proposedTimes.length > 0) {
          const firstTime = parsed.proposedTimes[0];
          if (firstTime) {
            const dateString = firstTime.toISOString().split("T")[0];
            if (dateString) {
              setSelectedDate(dateString);
            }
            setSelectedTime(firstTime.toTimeString().slice(0, 5));
          }
        }
      }
    }
  }, [isOpen, initialMeetingText, senderEmail]);

  const handleDateTimeChange = () => {
    if (selectedDate && selectedTime) {
      const dateTime = new Date(`${selectedDate}T${selectedTime}`);
      setMeetingDetails((prev) => ({
        ...prev,
        proposedTimes: [dateTime],
      }));
    }
  };

  useEffect(() => {
    handleDateTimeChange();
  }, [selectedDate, selectedTime]);

  const showSuccessNotification = (
    action: string,
    message: string,
    nextSteps: string,
  ) => {
    setSuccessDetails({ action, message, nextSteps });
    setShowSuccessModal(true);

    // Auto-close success modal after 8 seconds
    setTimeout(() => {
      setShowSuccessModal(false);
    }, 8000);
  };

  const generateCalendarEvent = (): CalendarEvent => {
    const startTime = meetingDetails.proposedTimes[0] || new Date();
    const endTime = new Date(
      startTime.getTime() + meetingDetails.duration * 60000,
    );

    return {
      title: meetingDetails.subject,
      description: meetingDetails.description,
      startTime,
      endTime,
      attendees: meetingDetails.participants,
      location: meetingDetails.isVirtual ? "Virtual Meeting" : undefined,
      reminderMinutes,
    };
  };

  const handleDownloadICS = () => {
    try {
      const event = generateCalendarEvent();
      CalendarService.downloadICSFile(event);
      toast.success("📅 Calendar file downloaded successfully!", {
        description: `Meeting "${meetingDetails.subject}" saved as .ics file`,
        duration: 4000,
      });

      // Show comprehensive success modal
      setTimeout(() => {
        showSuccessNotification(
          "Calendar File Downloaded",
          `Your meeting "${meetingDetails.subject}" has been saved as a calendar file (.ics)`,
          "Import the downloaded file into your preferred calendar application (Apple Calendar, Thunderbird, etc.) to complete the scheduling.",
        );
      }, 1000);
    } catch (error) {
      toast.error("Failed to generate calendar file");
      console.error("ICS generation error:", error);
    }
  };

  const handleOpenGoogleCalendar = () => {
    try {
      const event = generateCalendarEvent();
      const url = CalendarService.generateGoogleCalendarURL(event);
      window.open(url, "_blank");
      toast.success("📅 Opening Google Calendar...", {
        description: "Meeting details have been pre-filled for you",
        duration: 3000,
      });

      // Show comprehensive success modal
      setTimeout(() => {
        showSuccessNotification(
          "Google Calendar Opened",
          `Your meeting "${meetingDetails.subject}" is ready in Google Calendar`,
          "Complete the scheduling in the new tab that just opened. All meeting details have been pre-filled for your convenience.",
        );
      }, 2000);
    } catch (error) {
      toast.error("Failed to open Google Calendar");
      console.error("Google Calendar error:", error);
    }
  };

  const handleOpenOutlookCalendar = () => {
    try {
      const event = generateCalendarEvent();
      const url = CalendarService.generateOutlookCalendarURL(event);
      window.open(url, "_blank");
      toast.success("📅 Opening Outlook Calendar...", {
        description: "Meeting details have been pre-filled for you",
        duration: 3000,
      });

      // Show comprehensive success modal
      setTimeout(() => {
        showSuccessNotification(
          "Outlook Calendar Opened",
          `Your meeting "${meetingDetails.subject}" is ready in Outlook Calendar`,
          "Complete the scheduling in the new tab that just opened. All meeting details have been pre-filled for your convenience.",
        );
      }, 2000);
    } catch (error) {
      toast.error("Failed to open Outlook Calendar");
      console.error("Outlook Calendar error:", error);
    }
  };

  const handleSetReminder = async () => {
    try {
      const hasPermission = await ReminderService.requestPermission();
      if (!hasPermission) {
        toast.error("Please enable notifications to set reminders");
        return;
      }

      const meetingTime = meetingDetails.proposedTimes[0];
      if (!meetingTime) {
        toast.error("Please select a meeting date and time first");
        return;
      }

      // Set multiple reminders
      for (const minutes of reminderMinutes) {
        const reminderTime = new Date(meetingTime.getTime() - minutes * 60000);
        await ReminderService.scheduleReminder(
          `Meeting Reminder: ${meetingDetails.subject}`,
          `Your meeting "${meetingDetails.subject}" starts in ${minutes} minutes`,
          reminderTime,
          { tag: `meeting-${Date.now()}-${minutes}` },
        );
      }

      toast.success("🔔 Reminders Set Successfully!", {
        description: `${reminderMinutes.length} reminder${reminderMinutes.length > 1 ? "s" : ""} scheduled for ${reminderMinutes.join(", ")} minutes before your meeting`,
        duration: 5000,
      });

      // Show comprehensive success modal
      setTimeout(() => {
        showSuccessNotification(
          "Meeting Reminders Active",
          `${reminderMinutes.length} browser notification${reminderMinutes.length > 1 ? "s" : ""} scheduled for "${meetingDetails.subject}"`,
          `You'll receive notifications ${reminderMinutes.join(", ")} minutes before your meeting starts. Make sure browser notifications are enabled for the best experience.`,
        );
      }, 1500);
    } catch (error) {
      toast.error("Failed to set reminders");
      console.error("Reminder error:", error);
    }
  };

  const handleGenerateMeetingLink = () => {
    const links = CalendarService.generateMeetingLinks(meetingDetails);

    // Copy Google Meet link to clipboard
    navigator.clipboard
      .writeText(links.googleMeet)
      .then(() => {
        toast.success("🎥 Meeting Link Copied!", {
          description: "Google Meet link has been copied to your clipboard",
          duration: 4000,
        });

        // Show comprehensive success modal
        setTimeout(() => {
          showSuccessNotification(
            "Virtual Meeting Link Ready",
            `Meeting link for "${meetingDetails.subject}" has been copied to your clipboard`,
            "Share this Google Meet link with all participants. They can join the meeting directly by clicking the link at the scheduled time.",
          );
        }, 1000);
      })
      .catch(() => {
        toast.error("Failed to copy meeting link");
      });
  };

  const handleScheduleMeeting = () => {
    if (!meetingDetails.subject.trim()) {
      toast.error("Please enter a meeting subject");
      return;
    }

    if (!meetingDetails.proposedTimes[0]) {
      toast.error("Please select a meeting date and time");
      return;
    }

    onMeetingScheduled?.(meetingDetails);
    toast.success("✅ Meeting Details Prepared!", {
      description:
        "Choose your preferred calendar option below to complete the scheduling",
      duration: 4000,
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>Schedule Meeting</span>
            </DialogTitle>
            <DialogDescription>
              Create a calendar event and set up reminders for your meeting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Meeting Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject">Meeting Subject</Label>
                <Input
                  id="subject"
                  value={meetingDetails.subject}
                  onChange={(e) =>
                    setMeetingDetails((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                  placeholder="Enter meeting subject..."
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={meetingDetails.duration}
                    onChange={(e) =>
                      setMeetingDetails((prev) => ({
                        ...prev,
                        duration: parseInt(e.target.value) || 60,
                      }))
                    }
                    min="15"
                    step="15"
                    className="mt-1"
                  />
                </div>
                <div className="mt-6 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="virtual"
                    checked={meetingDetails.isVirtual}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setMeetingDetails((prev) => ({
                        ...prev,
                        isVirtual: e.target.checked,
                      }))
                    }
                    className="rounded"
                  />
                  <Label
                    htmlFor="virtual"
                    className="flex items-center space-x-1"
                  >
                    <Video className="h-4 w-4" />
                    <span>Virtual Meeting</span>
                  </Label>
                </div>
              </div>

              <div>
                <Label htmlFor="participants">
                  Participants (email addresses)
                </Label>
                <Input
                  id="participants"
                  value={meetingDetails.participants.join(", ")}
                  onChange={(e) =>
                    setMeetingDetails((prev) => ({
                      ...prev,
                      participants: e.target.value
                        .split(",")
                        .map((email) => email.trim())
                        .filter(Boolean),
                    }))
                  }
                  placeholder="Enter email addresses separated by commas..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={meetingDetails.description}
                  onChange={(e) =>
                    setMeetingDetails((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Add meeting agenda, notes, or additional details..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Reminder Settings */}
            <div className="border-t pt-4">
              <Label className="mb-3 flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span>Reminder Settings</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {[5, 15, 30, 60, 120].map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => {
                      setReminderMinutes((prev) =>
                        prev.includes(minutes)
                          ? prev.filter((m) => m !== minutes)
                          : [...prev, minutes].sort((a, b) => a - b),
                      );
                    }}
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${
                      reminderMinutes.includes(minutes)
                        ? "border border-blue-300 bg-blue-100 text-blue-700"
                        : "border border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`} before
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 border-t pt-4">
              <Button
                onClick={handleScheduleMeeting}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!meetingDetails.subject.trim()}
              >
                <Plus className="mr-2 h-4 w-4" />
                Prepare Meeting Details
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleOpenGoogleCalendar}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Google Calendar</span>
                </Button>

                <Button
                  onClick={handleOpenOutlookCalendar}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Outlook Calendar</span>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleDownloadICS}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download .ics</span>
                </Button>

                <Button
                  onClick={handleSetReminder}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                >
                  <Bell className="h-4 w-4" />
                  <span>Set Reminders</span>
                </Button>
              </div>

              {meetingDetails.isVirtual && (
                <Button
                  onClick={handleGenerateMeetingLink}
                  variant="outline"
                  className="flex w-full items-center justify-center space-x-2"
                >
                  <Video className="h-4 w-4" />
                  <span>Copy Google Meet Link</span>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-green-600">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <span className="text-lg">🎉</span>
              </div>
              <span>{successDetails.action}</span>
            </DialogTitle>
            <DialogDescription>
              {successDetails.message}
            </DialogDescription>
            <div className="space-y-3 pt-2">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Next Steps:</strong> {successDetails.nextSteps}
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              onClick={() => setShowSuccessModal(false)}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Got it! 👍
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
