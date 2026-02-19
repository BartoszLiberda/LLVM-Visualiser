import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

interface RegisterViewProps {
    registers: Record<string, number>
}

export default function RegisterView({ registers }: RegisterViewProps) {
    const data = Object.entries(registers).map(([name, value]) => ({
        name,
        value
    }));

    return (
        <ScrollArea className="h-[30vh]">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Register</TableHead>
                        <TableHead>Value</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={2} className="h-[25vh] text-center text-muted-foreground">
                                No registers active
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((reg) => (
                            <TableRow key={reg.name}>
                                <TableCell>
                                    {reg.name}
                                </TableCell>
                                <TableCell>
                                    {reg.value}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
    )
}