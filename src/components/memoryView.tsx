import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MemoryTableProps {
    memory: Record<string, number>
}

export default function MemoryView({ memory }: MemoryTableProps) {
    const data = Object.entries(memory).map(([address, value]) => ({
        memoryAddress: address,
        value
    }))

    return (
        <div className="flex flex-col h-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-1/2">Address</TableHead>
                        <TableHead className="w-1/2">Value</TableHead>
                    </TableRow>
                </TableHeader>
            </Table>
            <ScrollArea className="flex-1 min-h-0">
                <Table>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2} className="flex-1 min-h-0 text-center text-muted-foreground">
                                    Memory Empty
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row) => (
                                <TableRow key={row.memoryAddress}>
                                    <TableCell className="w-1/2">
                                        0x{parseInt(row.memoryAddress).toString(16)}
                                    </TableCell>
                                    <TableCell className="w-1/2">
                                        {row.value}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    )
}