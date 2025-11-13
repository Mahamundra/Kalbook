import { useCalendar } from "@/calendar/contexts/calendar-context";
import { useTranslations } from "@/calendar/hooks/use-translations";

import { AvatarGroup } from "@/components/ui/avatar-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function UserSelect() {
  const { users, selectedUserId, setSelectedUserId } = useCalendar();
  const t = useTranslations();

  const selectedUser = selectedUserId === "all" ? null : users.find(u => u.id === selectedUserId);

  return (
    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
      <SelectTrigger className="flex-1 md:w-48">
        <SelectValue>
          {selectedUserId === "all" ? (
            <span className="truncate">{t.allUsers}</span>
          ) : selectedUser ? (
            <span className="truncate">{selectedUser.name}</span>
          ) : null}
        </SelectValue>
      </SelectTrigger>

      <SelectContent align="end">
        <SelectItem value="all">
          <div className="flex items-center gap-1">
            <AvatarGroup max={2}>
              {users.map(user => (
                <Avatar key={user.id} className="size-6 text-xxs">
                  <AvatarImage src={user.picturePath ?? undefined} alt={user.name} />
                  <AvatarFallback className="text-xxs">{user.name[0]}</AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
            <span className="truncate">{t.allUsers}</span>
          </div>
        </SelectItem>

        {users.map(user => (
          <SelectItem key={user.id} value={user.id} className="flex-1">
            <div className="flex items-center gap-2">
              <Avatar key={user.id} className="size-6">
                <AvatarImage src={user.picturePath ?? undefined} alt={user.name} />
                <AvatarFallback className="text-xxs">{user.name[0]}</AvatarFallback>
              </Avatar>

              <span className="truncate">{user.name?.trim() || ''}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
